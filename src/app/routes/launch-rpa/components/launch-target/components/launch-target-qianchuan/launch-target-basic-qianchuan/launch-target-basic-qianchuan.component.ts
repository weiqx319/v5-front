import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { NzMessageService } from "ng-zorro-antd/message";
import { AuthService } from "../../../../../../../core/service/auth.service";
import { ActivatedRoute, Router } from "@angular/router";
import { LaunchService } from "../../../../../service/launch.service";
import { LaunchRpaService } from "../../../../../service/launch-rpa.service";
import { zip } from "rxjs";
import { deepCopy } from "@jzl/jzl-util";

@Component({
  selector: 'app-launch-target-basic-qianchuan',
  templateUrl: './launch-target-basic-qianchuan.component.html',
  styleUrls: ['./launch-target-basic-qianchuan.component.scss']
})
export class LaunchTargetBasicQianchuanComponent implements OnInit {

  @Output() resultsChange: EventEmitter<any> = new EventEmitter<any>();

  @Input() targetType;

  @Input() audienceTemplateId;

  @Input() childAudienceTemplateId;

  public activeType = {
    type: 'target'
  };

  public publisherId = 7;

  public defaultData = {
    audience_template_name: null,  // 定向包名称
    audience_desc: null, // 定向包描述
    promotion_way: "STANDARD",  // 定向包类型
    inventory_type_list: { delivery_range: [], union_video_type: [], inventory_all: true, universal: true },
    parent_id: 0,
    audience_setting: {},
    target_setting: {},
  };

  public landingTypeList = [
    { key: 'STANDARD', name: '专业版' },
    { key: 'SIMPLE', name: '极速版' },
  ];

  public objective_type = [
    {
      label: "落地页",
      value: "1",
    },
    {
      label: "iOS app",
      value: "2",
    },
    {
      label: "安卓 app",
      value: "4",
    }
  ];

  public curGroupFlag;

  public getting = false;
  public saveing = false;

  public cid;

  public isCopy = false;

  public targetConfig;

  public errorTipAry = {
    platform: {
      is_show: false,
      tip_text: '请选择操作系统'
    },  // 操作系统
    age: {
      is_show: false,
      tip_text: '请选择年龄范围'
    },  // 年龄
  };

  public tableHeight = document.body.clientHeight - 60 - 65;

  public reInitTarget = true;

  public isLaunchPackage = false;

  public curAudienceData = {};

  public isParentAudience = true;

  constructor(
    private message: NzMessageService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private launchService: LaunchService,
    public launchRpaService: LaunchRpaService,
  ) {

    this.cid = this.authService.getCurrentUserOperdInfo().select_cid;

    this.isCopy = this.route.snapshot.queryParams['is_copy'] === '1';

  }

  @HostListener('window:resize', ['$event'])
  onWindowResize(event: any) {
    this.tableHeight = document.body.clientHeight - 60 - 50 - 40 - 60;
  }

  ngOnInit() {
    if (this.targetType === 'package' || this.targetType === 'packageEdit') {
      this.isLaunchPackage = true;
    }
    if ((this.targetType === 'basicEdit' || this.targetType === 'package') && this.audienceTemplateId) {
      this.getLaunchRpaTemplateData(this.audienceTemplateId);
    }
    if (this.targetType === 'packageEdit' && this.audienceTemplateId && this.childAudienceTemplateId) {
      this.getEditData();
    }
  }

  landingTypeChange() {
    this.defaultData.audience_setting = {};
    this.defaultData.target_setting = {};
  }

  getEditData() {
    const getParentTarget = this.launchRpaService.getTargetDetailByQC(this.audienceTemplateId, { cid: this.cid });
    const getChildTarget = this.launchRpaService.getTargetDetailByQC(this.childAudienceTemplateId, { cid: this.cid });

    zip(getParentTarget, getChildTarget).subscribe(([parentTargetData, childTargetData]) => {

      if (parentTargetData['status_code'] && parentTargetData['status_code'] === 200) {
        const data = JSON.parse(JSON.stringify(parentTargetData['data']));
        this.defaultData.target_setting = data.audience_setting;
      }

      if (childTargetData['status_code'] && childTargetData['status_code'] === 200) {
        const data = JSON.parse(JSON.stringify(childTargetData['data']));
        this.defaultData.audience_template_name = data.audience_template_name;
        this.defaultData.audience_desc = data.audience_desc;
        this.defaultData.promotion_way = data.promotion_way;
        this.defaultData.inventory_type_list = data.inventory_type_list;
        this.defaultData.audience_setting = data.audience_setting;
        this.defaultData.parent_id = data.parent_id;
        this.curAudienceData = deepCopy(childTargetData['data']);
      }

    }, (err) => {

    });
  }

  getLaunchRpaTemplateData(id, type?) {
    this.getting = true;
    this.launchRpaService
      .getTargetDetailByQC(id, {
        cid: this.cid,
      })
      .subscribe(
        (result: any) => {
          if (result.status_code && result.status_code === 200) {
            const data = JSON.parse(JSON.stringify(result['data']));
            if (this.targetType !== 'package') {
              this.defaultData.audience_template_name = data.audience_template_name;
              this.defaultData.audience_desc = data.audience_desc;
            }
            this.defaultData.promotion_way = data.promotion_way;
            this.defaultData.inventory_type_list = data.inventory_type_list;
            this.defaultData.audience_setting = data.audience_setting;
            this.defaultData.parent_id = data.parent_id;
          } else if (result.status_code && result.status_code === 205) {

          } else {
            this.message.error(result.message);
          }
          this.getting = false;
        },
        (err: any) => {
          this.getting = false;
        },
        () => {
        },
      );
  }

  doCancel(type?, id?) {
    this.resultsChange.emit({ isClose: type, parentId: id });
  }

  doSave() {
    if (!this.defaultData.audience_template_name) {
      this.message.error('请输入定向包名称');
      return false;
    }
    let isVild = true;
    if (this.defaultData.promotion_way !== 'SIMPLE' && this.defaultData.audience_setting['audience_mode'] === 'CUSTOM' && Object.keys(this.defaultData.audience_setting['retargeting_tags']).length > 0) {
      Object.keys(this.defaultData.audience_setting['retargeting_tags']).forEach(item => {
        if (this.defaultData.audience_setting['retargeting_tags'][item].length) {
        } else {
          isVild = false;
        }
      });
    }
    if (!isVild) {
      this.message.error('请选择人群包');
      return false;
    }

    if (!this.saveing) {
      this.saveing = true;

      this.defaultData['cid'] = this.cid;
      this.defaultData['company_id'] = "33";


      if ((this.targetType === 'basicEdit' || this.targetType === 'packageEdit')) {
        const id = this.targetType === 'basicEdit' ? this.audienceTemplateId : this.childAudienceTemplateId;
        this.launchRpaService
          .updateLaunchAudienceTemplateQC(id, this.defaultData, {
            cid: this.cid,
          })
          .subscribe(
            (result: any) => {
              if (result.status_code && result.status_code === 200) {
                this.message.success('操作成功');
                this.doCancel('edit', this.audienceTemplateId);
              } else if (result.status_code && result.status_code === 205) {

              } else {
                this.message.error(result.message);
              }
              this.saveing = false;
            },
            (err: any) => {
              this.saveing = false;
            },
            () => {
            },
          );
      } else {
        this.defaultData.parent_id = this.targetType === 'package' ? this.audienceTemplateId : 0;

        this.launchRpaService
          .addLaunchAudienceTemplateQC(this.defaultData, {
            cid: this.cid,
          })
          .subscribe(
            (result: any) => {
              if (result.status_code && result.status_code === 200) {
                this.message.success('操作成功');
                this.doCancel('create', this.targetType === 'basic' ? "" : this.audienceTemplateId);
              } else if (result.status_code && result.status_code === 205) {

              } else {
                this.message.error(result.message);
              }
              this.saveing = false;
            },
            (err: any) => {
              this.saveing = false;
            },
            () => {
            },
          );
      }

    }
  }

}
