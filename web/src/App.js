import React, { Component } from "react";
import "antd/dist/antd.css";
import {
  Input,
  Spin,
  message,
  Row,
  Col,
  Card,
  Icon,
  Tooltip,
  Table,
  Progress
} from "antd";

import bytes from "bytes";

import "./App.css";
import FileTree from "./FileTree";
import { fetchImage, fetchLayer, fetchCaches } from "./image";
import {
  getFileType,
  TypeUnknown,
  convertCacheDate,
  convertTimeConsuming
} from "./util";
import FileTypeProportion from "./FileTypeProportion";
import logo from "./logo.png";

const Search = Input.Search;

const StepSearch = "search";
const StepDetail = "detail";

class App extends Component {
  state = {
    image: "",
    step: StepSearch,
    loading: false,
    basicInfo: null,
    fileTypeProportion: null,
    caches: null
  };
  // 获取image的基本信息
  async getBasicInfo(name, times = 0) {
    if (!name) {
      return;
    }
    const { loading } = this.state;
    if (!loading) {
      this.setState({
        loading: true
      });
    }
    try {
      if (times > 3) {
        throw new Error("Analyse image isn't done, please try again later.");
      }
      const { status, data } = await fetchImage(name);
      if (status === 202) {
        setTimeout(() => {
          this.getBasicInfo(name, times + 1);
        }, 5000);
        return;
      }
      this.setState({
        loading: false,
        basicInfo: data,
        step: StepDetail
      });
      this.fetchLayerInfo();
    } catch (err) {
      message.error(err.message);
      this.setState({
        loading: false
      });
    }
  }
  async fetchLayerInfo() {
    const { image, basicInfo } = this.state;
    const res = await fetchLayer(image, 0);
    const { data } = res;
    const sizeMap = {};
    const loop = item => {
      if (!item) {
        return;
      }
      const { children } = item;
      if (children) {
        const keys = Object.keys(item.children);
        keys.forEach(key => {
          const tmp = children[key];
          if (tmp.isDir) {
            loop(tmp);
            return;
          }
          // 软链接，忽略
          if (tmp.linkName) {
            return;
          }
          const fileType = getFileType(key);
          if (!fileType) {
            return;
          }
          if (!sizeMap[fileType]) {
            sizeMap[fileType] = 0;
          }
          sizeMap[fileType] += tmp.size;
        });
      }
    };
    loop(data);
    let otherTypeSize = basicInfo.sizeBytes;
    Object.keys(sizeMap).forEach(item => {
      otherTypeSize -= sizeMap[item];
    });
    sizeMap[TypeUnknown] = otherTypeSize;
    this.setState({
      fileTypeProportion: sizeMap
    });
  }
  onSearch(name) {
    this.setState({
      image: name
    });
    this.getBasicInfo(name, 0);
  }
  async refreshCacheImages() {
    const { caches } = this.state;
    try {
      const { data } = await fetchCaches();
      const key = JSON.stringify(data);
      if (!caches || JSON.stringify(caches) !== key) {
        this.setState({
          caches: data
        });
      }
    } catch (err) {
      message.error(err.message);
    }
  }
  renderSearch() {
    const { step } = this.state;
    if (step !== StepSearch) {
      return;
    }
    return (
      <div className="diving-search-wrapper">
        <a
          href="https://github.com/vicanso/diving"
          style={{
            position: "absolute",
            padding: "10px",
            right: 0,
            top: 0
          }}
        >
          <svg
            height="32"
            viewBox="0 0 16 16"
            width="32"
            aria-hidden="true"
            style={{
              fill: "rgb(255, 255, 255)"
            }}
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
        <Search
          autoFocus
          addonBefore="Docker image:"
          className="diving-search"
          placeholder="Input docker image's name(e.g., redis:alpine)"
          enterButton="Search"
          size="large"
          onSearch={value => this.onSearch(value)}
        />
      </div>
    );
  }
  renderBasicInfo() {
    const { basicInfo, fileTypeProportion } = this.state;
    const efficiencyScoreName = "Efficiency Score";
    const imageSizeName = "Image Size";
    const userSizeName = "User Size";
    const wastedSizeName = "Wasted Size";
    const keys = [
      {
        name: efficiencyScoreName,
        title: "Image efficiency score",
        value: `${(basicInfo.efficiency * 100).toFixed(2)}%`
      },
      {
        name: imageSizeName,
        title:
          "Image size and file type proportion(Text, Image, Document, Compression, Others)",
        value: bytes.format(basicInfo.sizeBytes)
      },
      {
        name: userSizeName,
        title: "All bytes except for the base image",
        value: bytes.format(basicInfo.userSizeBytes)
      },
      {
        name: wastedSizeName,
        title: "All bytes of remove or duplicate files",
        value: bytes.format(basicInfo.wastedBytes)
      }
    ];
    const renderEfficiencyScoreProgress = item => {
      if (item.name !== efficiencyScoreName) {
        return;
      }
      return (
        <Tooltip title="Efficiency score gt than 95 may be good">
          <Progress
            style={{
              marginTop: "15px"
            }}
            strokeWidth={15}
            percent={basicInfo.efficiency * 100}
            showInfo={false}
            strokeColor={"rgb(19, 194, 194)"}
            strokeLinecap={"square"}
          />
        </Tooltip>
      );
    };
    const renderFileTypeProportion = item => {
      if (item.name !== imageSizeName || !fileTypeProportion) {
        return;
      }
      return (
        <FileTypeProportion
          style={{
            marginTop: "20px"
          }}
          data={fileTypeProportion}
        />
      );
    };
    const renderUserSize = item => {
      if (item.name !== userSizeName) {
        return;
      }
      return (
        <Progress
          style={{
            marginTop: "15px"
          }}
          strokeWidth={15}
          percent={(basicInfo.userSizeBytes * 100) / basicInfo.sizeBytes}
          showInfo={false}
          strokeColor={"rgb(149, 85, 229)"}
          strokeLinecap={"square"}
        />
      );
    };
    const renderWastedSize = item => {
      if (item.name !== wastedSizeName) {
        return;
      }
      const maxSize = 5 * 1024 * 1024;
      const percent = Math.min(100, (100 * basicInfo.wastedBytes) / maxSize);
      let status = "success";
      if (percent > 70) {
        status = "exception";
      } else if (percent > 50) {
        status = "normal";
      }
      return (
        <Tooltip title="Wasted size should be lt than 2MB">
          <Progress
            style={{
              marginTop: "15px"
            }}
            status={status}
            strokeWidth={15}
            percent={percent}
            showInfo={false}
            strokeLinecap={"square"}
          />
        </Tooltip>
      );
    };
    const basicInfoCols = keys.map(item => (
      <Col
        xs={24}
        sm={12}
        md={12}
        lg={12}
        xl={6}
        key={item.name}
        className="diving-row-col"
      >
        <Card>
          <Tooltip title={item.title}>
            <Icon
              type="info-circle"
              style={{
                float: "right",
                cursor: "pointer"
              }}
            />
          </Tooltip>
          <span>{item.name}</span>
          <p>{item.value}</p>
          {renderEfficiencyScoreProgress(item)}
          {renderFileTypeProportion(item)}
          {renderUserSize(item)}
          {renderWastedSize(item)}
        </Card>
      </Col>
    ));
    return <Row className="diving-basic-info diving-row">{basicInfoCols}</Row>;
  }
  renderLayersAndInefficiency() {
    const { basicInfo } = this.state;
    const layerColumns = [
      {
        title: "Image ID",
        dataIndex: "shortID"
      },
      {
        title: "Size",
        dataIndex: "size",
        render: size => bytes.format(size),
        sorter: (a, b) => a.size - b.size
      },
      {
        title: "Command",
        dataIndex: "command",
        render: text => (
          <span
            style={{
              wordBreak: "break-all"
            }}
          >
            {text}
          </span>
        )
      }
    ];
    const inefficiencyColumn = [
      {
        title: "Path",
        dataIndex: "path"
      },
      {
        title: "Cumulative Size",
        dataIndex: "cumulativeSize",
        defaultSortOrder: "descend",
        render: size => bytes.format(size),
        sorter: (a, b) => a.cumulativeSize - b.cumulativeSize
      },
      {
        title: "Count",
        dataIndex: "count",
        sorter: (a, b) => a.count - b.count
      }
    ];
    const layerAnalysisData = basicInfo.layerAnalysisList.map(item => {
      item.key = item.id;
      return item;
    });
    let inefficiencyData = null;
    if (basicInfo.inefficiencyAnalysisList) {
      inefficiencyData = basicInfo.inefficiencyAnalysisList.map(item => {
        item.key = item.path;
        return item;
      });
    }

    return (
      <Row className="diving-row">
        <Col xs={24} sm={24} md={24} lg={24} xl={12} className="diving-row-col">
          <Card title="Image Layers">
            <Table columns={layerColumns} dataSource={layerAnalysisData} />
          </Card>
        </Col>
        <Col xs={24} sm={24} md={24} lg={24} xl={12} className="diving-row-col">
          <Card title="Inefficient Files">
            <Table columns={inefficiencyColumn} dataSource={inefficiencyData} />
          </Card>
        </Col>
      </Row>
    );
  }
  renderFileTrees() {
    const { image, basicInfo } = this.state;
    if (!image || !basicInfo) {
      return;
    }
    return <FileTree image={image} layers={basicInfo.layerAnalysisList} />;
  }
  renderDetailInfo() {
    const { step } = this.state;
    if (step !== StepDetail) {
      return;
    }
    return (
      <div>
        <header className="diving-header">
          <a className="diving-logo" href="/">
            <img
              style={{
                marginRight: "5px"
              }}
              src={logo}
              alt="logo"
            />
            <h1>Diving</h1>
          </a>
        </header>
        <div className="diving-detail-info">
          {this.renderBasicInfo()}
          {this.renderFileTrees()}
          {this.renderLayersAndInefficiency()}
        </div>
      </div>
    );
  }
  renderCacheImages() {
    const { caches } = this.state;
    if (!caches) {
      return;
    }
    const keys = Object.keys(caches);
    if (keys.length === 0) {
      return;
    }
    keys.sort((k1, k2) => caches[k2].createdAt - caches[k1].createdAt);
    const arr = keys.map(key => {
      const item = caches[key];
      const date = convertCacheDate(item.createdAt);
      let iconType = "loading";
      let color = "#1890ff";
      let timeConsuming = null;
      if (item.status === 2) {
        iconType = "check-circle";
        color = "#52c41a";
      } else if (item.status === 1) {
        iconType = "close-circle";
        color = "#f5222d";
      }
      if (item.timeConsuming) {
        timeConsuming = (
          <span
            style={{
              margin: "0 5px"
            }}
          >
            {convertTimeConsuming(item.timeConsuming)}
          </span>
        );
      }
      return (
        <div
          key={key + item.status}
          className="diving-cache-image"
          onClick={() => this.onSearch(key)}
        >
          {key}
          <span
            style={{
              margin: "0 5px"
            }}
          >
            {date}
          </span>
          {timeConsuming}
          <Icon
            type={iconType}
            style={{
              color
            }}
          />
        </div>
      );
    });
    return <div className="diving-cache-images">{arr}</div>;
  }
  render() {
    return (
      <Spin spinning={this.state.loading} tip="loading...">
        <div className="diving">
          {this.renderSearch()}
          {this.renderDetailInfo()}
          {this.renderCacheImages()}
        </div>
      </Spin>
    );
  }
  componentDidMount() {
    setInterval(() => {
      this.refreshCacheImages();
    }, 5000);
    this.refreshCacheImages();
  }
}

export default App;
