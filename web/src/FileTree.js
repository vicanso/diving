import React, { Component } from "react";
import bytes from "bytes";
import PropTypes from "prop-types";
import {
  Icon,
  Spin,
  Row,
  Col,
  Card,
  message,
  Select,
  Checkbox,
  Tooltip,
  Input
} from "antd";

import { fetchLayer } from "./image";

import "./FileTree.css";

const Option = Select.Option;

const colors = {
  changed: "#ff9100",
  added: "#00e676",
  removed: "#ff3d00",
  default: "rgba(0, 0, 0, 0.65)"
};
const sizeLimitArr = [
  {
    name: "no limit",
    value: 0
  },
  {
    name: ">=10KB",
    value: 10 * 1024
  },
  {
    name: ">=30KB",
    value: 30 * 1024
  },
  {
    name: ">=100KB",
    value: 100 * 1024
  },
  {
    name: ">=500KB",
    value: 500 * 1024
  },
  {
    name: ">=1MB",
    value: 1024 * 1024
  },
  {
    name: ">=10MB",
    value: 10 * 1024 * 1024
  }
];

class FileTree extends Component {
  state = {
    keyword: "",
    sizeFilter: "",
    showModifications: false,
    expandAll: false,
    expands: [],
    fileTree: null,
    loading: false
  };
  // 是否应该展开此目录
  shouldExpand(level, name) {
    const { expandAll } = this.state;
    // 如果设置全部展开
    if (expandAll) {
      return true;
    }
    return this.findExpandIndex(level, name) !== -1;
  }
  findExpandIndex(level, name) {
    const { expands } = this.state;
    let found = -1;
    if (!expands) {
      return found;
    }
    expands.forEach((item, index) => {
      if (found !== -1) {
        return;
      }
      if (item.level === level && item.name === name) {
        found = index;
      }
    });
    return found;
  }
  getFileTree() {
    const { keyword, showModifications, sizeFilter, fileTree } = this.state;
    if (!fileTree) {
      return null;
    }
    if (!keyword && !sizeFilter && !showModifications) {
      return fileTree;
    }
    let reg = null;
    // 如果只是 \ 时，先不生成正则，因为此时还仅是转义字符
    if (keyword && keyword !== "\\") {
      try {
        reg = new RegExp(keyword, "gi");
      } catch (err) {
        console.error(err);
      }
    }
    const minSize = sizeFilter;
    // 判断是否符合筛选条件
    const check = (name, item) => {
      const { size } = item;
      let regCheck = true;
      let sizeCheck = true;
      let modificationCheck = true;
      if (reg) {
        regCheck = reg.test(name);
      }
      if (minSize) {
        sizeCheck = size >= minSize;
      }
      if (showModifications && !item.diffType) {
        modificationCheck = false;
      }
      return regCheck && sizeCheck && modificationCheck;
    };
    // 复制
    const copy = item => {
      const clone = Object.assign({}, item);
      delete clone.children;
      return clone;
    };
    // 筛选复制可用的节点
    const filter = (current, original) => {
      if (!original || !original.children) {
        return;
      }
      const keys = Object.keys(original.children);
      keys.forEach(k => {
        const originalItem = original.children[k];
        const item = copy(originalItem);
        if (item.isDir) {
          filter(item, originalItem);
        }
        // 如果是目录，而且目录下有文件
        if (
          check(k, item) ||
          (item.isDir &&
            item.children &&
            Object.keys(item.children).length !== 0)
        ) {
          current.children = current.children || {};
          current.children[k] = item;
        }
      });
    };
    const result = copy(fileTree);
    filter(result, fileTree);
    return result;
  }
  // 切换展开的显示
  toggleExpand(level, name) {
    const { expands } = this.state;
    const index = this.findExpandIndex(level, name);
    if (index !== -1) {
      expands.splice(index, 1);
    } else {
      expands.push({
        level,
        name
      });
    }
    this.setState({
      expands
    });
  }
  renderFileNodes() {
    const tree = this.getFileTree();
    if (!tree) {
      return;
    }
    const fileNodes = [];
    fileNodes.push(
      <div key={"fields"} className="diving-file-tree-item">
        <span className="mode">Permission</span>
        <span className="ids">UID:GID</span>
        <span className="size">Size</span>
        <span>FileTree</span>
      </div>
    );
    const renderFileAnalysis = (tree, prefix, level) => {
      if (!tree.children || tree.children.length === 0) {
        return null;
      }
      const keys = Object.keys(tree.children);
      keys.forEach((k, index) => {
        const item = tree.children[k];
        const size = bytes.format(item.size);
        let name = k;
        // 非目录非软链接
        // if (!item.isDir && !item.linkName && item.size) {
        //   totalSizeOfFile += item.size;
        // }
        if (item.linkName) {
          name += ` → ${item.linkName}`;
        }
        let mode = item.mode;
        if (mode && mode.charAt(0) === "L") {
          mode = "-" + mode.substring(1);
        }
        const hasChildren = item.children && item.children.length !== 0;
        const expanded = this.shouldExpand(level, k);
        let fontColor = "";
        switch (item.diffType) {
          case 1:
            fontColor = colors.changed;
            break;
          case 2:
            fontColor = colors.added;
            break;
          case 3:
            fontColor = colors.removed;
            break;
          default:
            fontColor = colors.default;
            break;
        }
        let iconType = "plus-square";
        if (expanded) {
          iconType = "minus-square";
        }
        fileNodes.push(
          <div
            className="diving-file-tree-item"
            key={`${prefix}-${k}`}
            style={{
              color: fontColor
            }}
          >
            <span className="mode">{mode}</span>
            <span className="ids">{item.ids}</span>
            <span className="size">{size}</span>
            <span
              style={{
                paddingLeft: `${level * 26}px`
              }}
            >
              {hasChildren && (
                <Icon
                  type={iconType}
                  style={{
                    padding: 0,
                    color: fontColor,
                    marginRight: "5px"
                  }}
                  onClick={() => this.toggleExpand(level, name)}
                />
              )}
              {name}
            </span>
          </div>
        );
        if (hasChildren && expanded) {
          renderFileAnalysis(item, `${prefix}-${k}`, level + 1);
        }
      });
    };
    renderFileAnalysis(tree, "root", 0);
    return fileNodes;
  }
  // 获取 layer的文件树
  async getTree(layer = 0) {
    const { image } = this.props;
    this.setState({
      fileTree: null,
      loading: true
    });
    try {
      const res = await fetchLayer(image, layer);
      this.setState({
        fileTree: res.data
      });
    } catch (err) {
      message.error(err.message);
    } finally {
      this.setState({
        loading: false
      });
    }
  }
  onChangeLayer(value) {
    const { layers } = this.props;
    let found = -1;
    layers.forEach((item, index) => {
      if (item.shortID === value) {
        found = index;
      }
    });
    if (found === -1) {
      return;
    }
    this.getTree(found);
  }
  onChangeSizeFilter(value) {
    this.setState({
      sizeFilter: value
    });
  }
  componentDidMount() {
    this.getTree(0);
  }
  renderFunctions() {
    const { layers } = this.props;
    const layerArr = layers.map(item => {
      let sizeDesc = "";
      if (item.size) {
        sizeDesc = `(${bytes.format(item.size)})`;
      }
      return (
        <Option key={item.shortID} value={item.shortID}>
          {item.shortID + sizeDesc}
        </Option>
      );
    });
    const sizeArr = sizeLimitArr.map(item => (
      <Option key={item.name} value={item.value}>
        {item.name}
      </Option>
    ));
    return (
      <div className="diving-file-tree-functions">
        <div className="diving-file-tree-functions-item">
          <label
            style={{
              marginRight: "10px"
            }}
          >
            Layer:
          </label>
          <Select
            defaultValue={layers[0].shortID}
            style={{
              width: "230px"
            }}
            onChange={value => this.onChangeLayer(value)}
          >
            {layerArr}
          </Select>
        </div>
        <div className="diving-file-tree-functions-item">
          <label
            style={{
              marginRight: "10px"
            }}
          >
            Size:
          </label>
          <Select
            defaultValue={sizeLimitArr[0].value}
            style={{
              width: "120px"
            }}
            onChange={value => this.onChangeSizeFilter(value)}
          >
            {sizeArr}
          </Select>
        </div>
        <div className="diving-file-tree-functions-item">
          <Checkbox
            onChange={e =>
              this.setState({
                showModifications: e.target.checked
              })
            }
          >
            Modifications
            <Tooltip title="only show modified files">
              <Icon
                type="info-circle"
                style={{
                  marginLeft: "5px",
                  cursor: "pointer"
                }}
              />
            </Tooltip>
          </Checkbox>
        </div>
        <div className="diving-file-tree-functions-item">
          <Checkbox
            onChange={e =>
              this.setState({
                expandAll: e.target.checked
              })
            }
          >
            Expand
            <Tooltip title="expand all folder">
              <Icon
                type="info-circle"
                style={{
                  marginLeft: "5px",
                  cursor: "pointer"
                }}
              />
            </Tooltip>
          </Checkbox>
        </div>
        <div className="diving-file-tree-functions-item">
          <Input
            style={{
              width: "250px"
            }}
            onChange={e =>
              this.setState({
                keyword: e.target.value
              })
            }
            placeholder="support regexp"
            addonBefore="Keyword:"
          />
        </div>
      </div>
    );
  }
  render() {
    const { loading } = this.state;
    const title = (
      <div>
        Layer Content
        <div className="diving-file-tree-color">
          <span
            style={{
              color: colors.changed
            }}
          >
            Modified
          </span>
          <span
            style={{
              color: colors.added
            }}
          >
            Added
          </span>
          <span
            style={{
              color: colors.removed
            }}
          >
            Removed
          </span>
          <Tooltip title="Color of file's status in file tree">
            <Icon
              type="info-circle"
              style={{
                float: "right",
                cursor: "pointer"
              }}
            />
          </Tooltip>
        </div>
      </div>
    );

    return (
      <Row className="diving-row">
        <Col className="diving-row-col">
          <Card title={title}>
            {this.renderFunctions()}
            <Spin spinning={loading} tip="loading...">
              {this.renderFileNodes()}
            </Spin>
          </Card>
        </Col>
      </Row>
    );
  }
}

FileTree.propTypes = {
  image: PropTypes.string.isRequired,
  layers: PropTypes.array.isRequired
};

export default FileTree;
