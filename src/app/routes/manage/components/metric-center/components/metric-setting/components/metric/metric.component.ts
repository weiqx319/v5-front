import { Component, HostListener, OnInit } from '@angular/core';
import { ManageService } from "../../../../../../service/manage.service";
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ManageItemService } from "../../../../../../service/manage-item.service";
import { DefineSettingService } from "../../../../../../service/define-setting.service";
import { AddMetricDataComponent } from "../../../../../../modal/add-metric-data/add-metric-data.component";
import { isNumber, isUndefined } from "@jzl/jzl-util";

import { CustomDatasService } from '../../../../../../../../shared/service/custom-datas.service';

@Component({
  selector: 'app-metric',
  templateUrl: './metric.component.html',
  styleUrls: ['./metric.component.scss']
})
export class MetricComponent implements OnInit {

  _indeterminate = false; // 表示有选中的，不管是全选还是选个别
  _allChecked = false;
  public apiData = [];
  public total = 0;
  public loading = true;
  public currentPage = 1;
  public pageSize = 500;
  public advertiserList = [];
  //媒体列表
  public publiserList = [];
  public channelList = [];

  public publisherTypeRelation: object;
  public channelTypeRelation: object;
  public noResultHeight = document.body.clientHeight - 310;
  filterResult = {
    pub_account_name: {
    },
    account_status: {
    },
    publisher_id: {

    },
    cid: {

    },
    channel_id: {

    },
    category_id: {},
    metric_name: {},
  };

  //指标分类列表
  public categoryList = [];

  constructor(private manageService: ManageService,
    private defineSettingService: DefineSettingService,
    private manageItemService: ManageItemService,
    private modalService: NzModalService,
    private message: NzMessageService,
    private customDatasService: CustomDatasService,
  ) {
    this.publisherTypeRelation = this.customDatasService.publisherNewMapObjKey;
    this.channelTypeRelation = this.customDatasService.channelMapObjKey;
    this.channelList = this.customDatasService.channelList;
    this.publisherTypeRelation['publisher_id_999'] = '通用';
    this.noResultHeight = document.body.clientHeight - 310;
    this.publiserList = this.customDatasService.publisherNewList;
    this.publiserList = [{ name: '通用', key: 999 }, ...this.publiserList];

  }


  @HostListener('window:resize', ['$event'])
  onWindowResize(event?) {
    this.noResultHeight = document.body.clientHeight - 310;
  }

  // 获取指标分类列表
  getMetricCategoryList() {
    this.defineSettingService.getMetricCategoryList().subscribe(
      (results: any) => {
        if (results.status_code !== 200) {
          this.categoryList = [];
        } else {
          results['data']['detail'].map(item => {
            this.categoryList.push({
              'name': item.category_name,
              'key': item.category_id
            });
          });
        }
      },
      (err: any) => {
        this.message.error('指标分类数据获取异常，请重试');
      }
    );
  }

  _refreshStatus() {
    const allChecked = this.apiData.every(value => value.disabled || value.checked);
    const allUnchecked = this.apiData.every(value => !value.checked);
    // 表示不是全选，但是有选中的
    this._indeterminate = ((!allUnchecked) && (!allChecked)) || allChecked;
    this._allChecked = allChecked;
  }

  _checkAll(value) {
    if (value) {
      this.apiData.forEach(data => {
        if (!data.disabled) {
          data.checked = true;
        }
      });
      this._indeterminate = true;
    } else {
      this._indeterminate = false;
      this.apiData.forEach(data => data.checked = false);
    }
  }


  addMetric() {
    this.manageService.getAdvertiserList({}, { result_model: 'all', need_publish_account: 0 }).subscribe(result => {
      if (result['status_code'] && result.status_code === 200) {
        const add_modal = this.modalService.create({
          nzTitle: '添加指标',
          nzWidth: 600,
          nzContent: AddMetricDataComponent,
          nzClosable: false,
          nzMaskClosable: false,
          nzWrapClassName: 'sub-company-manage-modal',
          nzFooter: null,
          nzComponentParams: {
            categoryList: this.categoryList,
          }
        });
        add_modal.afterClose.subscribe(addResult => {
          if (addResult === 'onOk') {
            this.refreshData();
          }
        });
      } else if (result['status_code'] && result.status_code === 201) {
        this.message.error('广告主名称已经存在，请重试');
      } else if (result['status_code'] && result.status_code === 401) {
        this.message.error('您没权限对此操作！');
      } else if (result['status_code'] && result.status_code === 500) {
        this.message.error('系统异常，请重试');
      } else if (result['status_code'] && result.status_code === 205) {
        this.message.error('您没有可用的广告主，请联系管理员分配');
      } else {
        this.message.error(result.message);
      }
    }, (err) => {

      this.message.error('系统异常，请重试');
    }
    );
  }


  delMetrics(metricId?: number) {
    const postBody = { metric_define_ids: [] };
    if (isUndefined(metricId)) {
      this.apiData.forEach(data => {
        if (data.checked) {
          postBody.metric_define_ids.push(data.metric_define_id);
        }
      });
      if (postBody.metric_define_ids.length > 0) {
        this.defineSettingService.delMetric(postBody).subscribe((result: any) => {
          if (result.status_code === 200) {

            this.message.success('删除成功');
            this.refreshData();
          }
        },
          (err: any) => {
            this.message.error('删除失败,请重试');
          },
          () => {
          });
      } else {
        this.message.info('请选择相关项操作');
      }
    } else if (isNumber(metricId) && metricId > 0) {
      postBody.metric_define_ids.push(metricId);
      this.defineSettingService.delMetric(postBody).subscribe((result: any) => {
        if (result.status_code === 200) {
          this.message.success('删除成功');
          this.refreshData();
        }
      },
        (err: any) => {
          this.message.error('删除失败,请重试');
        },
        () => {
        });
    } else {
      this.message.error('请勿非法操作');
    }
  }



  editMetric(metricId) {
    this.defineSettingService.getMetricData(metricId).subscribe(
      (result) => {
        if (result['status_code'] && result.status_code === 200) {
          const metricData = result['data'];
          const editModal = this.modalService.create({
            nzTitle: '编辑指标数据',
            nzWidth: 600,
            nzContent: AddMetricDataComponent,
            nzClosable: false,
            nzMaskClosable: false,
            nzWrapClassName: 'sub-company-manage-modal',
            nzFooter: null,
            nzComponentParams: {
              metricDataId: metricId,
              metricData: metricData,
              categoryList: this.categoryList,
            }
          });
          editModal.afterClose.subscribe(resultModal => {
            if (resultModal === 'onOk') {
              this.refreshData();
            }
          });
        } else if (result['status_code'] && result.status_code === 401) {
          this.message.error('您没权限对此操作！');
        } else if (result['status_code'] && result.status_code === 404) {
          this.message.error('API未实现，找言十！');
        } else if (result['status_code'] && result.status_code === 500) {
          this.message.error('系统异常，请重试');
        } else {
          this.message.error(result.message);
        }
      }, (err) => {

        this.message.error('系统异常，请重试');
      }
    );

  }

  refreshData(status?) {
    if (status) {
      this.currentPage = 1;
    }
    const postBody = {
      'pConditions': []
    };
    Object.values(this.filterResult).forEach(item => {
      if (item.hasOwnProperty('key')) {
        postBody.pConditions.push(item);
      }
    });
    this.defineSettingService.getMetricList(postBody, { page: this.currentPage, count: this.pageSize }).subscribe(
      (results: any) => {
        if (results.status_code !== 200) {
          this.apiData = [];
          this.total = 0;
        } else {
          this.apiData = results['data']['detail'];
          this.total = results['data']['detail_count'];
        }
        this.loading = false;
      },
      (err: any) => {
        this.loading = false;
        this.message.error('数据获取异常，请重试');
      },
      () => {
      }
    );
  }
  getAdvertiserList() {
    this.manageService.getAdvertiserList({}, { result_model: 'all', need_publish_account: 0 }).subscribe(result => {
      if (result['status_code'] && result.status_code === 200) {
        result['data'].forEach((item) => {
          this.advertiserList.push({
            'name': item.advertiser_name,
            'key': item.cid
          });
        });
      } else if (result['status_code'] && result.status_code === 201) {
        this.message.error('广告主名称已经存在，请重试');
      } else if (result['status_code'] && result.status_code === 401) {
        this.message.error('您没权限对此操作！');
      } else if (result['status_code'] && result.status_code === 500) {
        this.message.error('系统异常，请重试');
      } else {
        this.message.error(result.message);
      }
    }, (err) => {

      this.message.error('系统异常，请重试');
    }
    );
  }
  ngOnInit() {
    this.onWindowResize();
    this.getAdvertiserList();
    this.refreshData();
    this.getMetricCategoryList();

  }
  doFilter() {
    this.currentPage = 1;
    this.refreshData();
  }

  // 修改是否默认
  changeConversionDefault(value) {
    const is_default = value.is_default ? 1 : 0;
    // 需要对应的接口
    this.defineSettingService.updateMetricMetricDefault(value.metric_define_id, { is_default: is_default,cid:value.cid }).subscribe(data => {
      if (data['status_code'] && data.status_code === 200) {
        this.message.success('更新成功');
      } else {
        this.message.error(data.message);
      }
      // this.refreshData();
    }, (err) => {
      this.message.error('系统异常，请重试');
    }, () => { });
  }
}
