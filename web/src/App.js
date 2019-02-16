import React, { Component } from "react";
import "./App.css";
import ImageSearch from "./ImageSearch";
import LinearProgress from "@material-ui/core/LinearProgress";
import axios from "axios";
import {
  Grid,
  Table,
  TableRow,
  TableCell,
  TableHead,
  TableBody,
  MenuItem,
  Checkbox,
  FormControlLabel,
  InputBase,
  Tooltip,
  Select
} from "@material-ui/core";
import Paper from "@material-ui/core/Paper";
import AppBar from "@material-ui/core/AppBar";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";

import bytes from "bytes";
import CodeIcon from "@material-ui/icons/Code";
import CloseIcon from "@material-ui/icons/Close";
import HelpIcon from "@material-ui/icons/Help";
import IconButton from "@material-ui/core/IconButton";
import BorderInnerIcon from "@material-ui/icons/BorderInner";
import BorderClearIcon from "@material-ui/icons/BorderClear";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import DonutLargeIcon from "@material-ui/icons/DonutLarge";

import Message from "./Message";

const colors = {
  changed: "#ff9100",
  added: "#00e676",
  removed: "#ff3d00",
  size: "#1a237e",
  default: "#333"
};

const loadingStatus = "loading";

function getErrorMessage(err) {
  if (!err) {
    return "";
  }
  if (err.response) {
    return err.response.data.message;
  }
  return err.message;
}

// 生成模块标题
function createTitle(title, left) {
  return (
    <div
      style={{
        lineHeight: "40px",
        position: "relative",
        fontSize: "16px",
        color: "#333"
      }}
    >
      <h3
        style={{
          margin: 0,
          fontWeight: 600
        }}
      >
        {title}
      </h3>
      <div
        style={{
          borderBottom: "1px solid rgba(80, 80, 80, 0.85)",
          position: "absolute",
          left: left,
          right: 0,
          top: "50%",
          marginTop: "1px"
        }}
      />
    </div>
  );
}

class App extends Component {
  state = {
    status: "",
    image: "",
    detailCmdID: "",
    error: null,
    basicInfo: null,
    expands: [],
    expandAll: false,
    showModifications: false,
    fileTree: null,
    keyword: "",
    sizeFilter: "",
    getTreeStatus: "",
    selectedLayer: ""
  };
  // 获取 layer的文件树
  async getTree(layer = 0) {
    const { image } = this.state;
    this.setState({
      fileTree: null,
      error: null,
      getTreeStatus: loadingStatus,
    });
    try {
      const res = await axios.get(`/api/images/tree/${image}?layer=${layer}`);
      this.setState({
        fileTree: res.data
      });
    } catch (err) {
      this.setState({
        error: err
      });
    } finally {
      this.setState({
        getTreeStatus: "",
      })
    }
  }
  // 获取image的基本信息
  async getBasicInfo(name, times = 0) {
    if (!name) {
      return;
    }
    this.setState({
      status: loadingStatus
    });
    try {
      if (times > 3) {
        throw new Error("Timeout, please try again later.");
      }
      const { status, data } = await axios.get(`/api/images/detail/${name}`);
      if (status === 202) {
        setTimeout(() => {
          this.getBasicInfo(name, times + 1);
        }, 5000);
        return;
      }
      this.setState({
        // 不能在finally中设置状态，
        // 因为会循环的去查询
        status: "",
        basicInfo: data
      });
      if (data.layerAnalysisList) {
        this.showLayer(data.layerAnalysisList[0].shortID);
      }
    } catch (err) {
      this.setState({
        status: "",
        error: err,
      });
    }
  }
  findExpandIndex(level, name) {
    const { expands } = this.state;
    let found = -1;
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
  // 是否应该展开此目录
  shouldExpand(level, name) {
    const { expandAll } = this.state;
    // 如果设置全部展开
    if (expandAll) {
      return true;
    }
    return this.findExpandIndex(level, name) !== -1;
  }
  // 切换展示该 layer的命令
  toggleDetailCmd(id) {
    const { detailCmdID } = this.state;
    if (id !== detailCmdID) {
      this.setState({
        detailCmdID: id
      });
      return;
    }
    this.setState({
      detailCmdID: ""
    });
  }
  onSearch(image) {
    if (!image) {
      return;
    }
    this.setState({
      image
    });
    this.getBasicInfo(image);
  }
  showLayer(id = "") {
    const { basicInfo } = this.state;
    this.setState({
      selectedLayer: id
    });
    if (!id) {
      return;
    }
    let index = -1;
    basicInfo.layerAnalysisList.forEach((item, i) => {
      if (item.shortID === id) {
        index = i;
      }
    });
    if (index !== -1) {
      this.getTree(index);
    }
  }
  // 返回
  goBack() {
    // 清除重置信息
    this.setState({
      status: "",
      image: "",
      detailCmdID: "",
      error: null,
      basicInfo: null,
      expands: [],
      expandAll: false,
      showModifications: false,
      fileTree: null,
      keyword: "",
      sizeFilter: "",
      selectedLayer: ""
    });
  }
  getFileTree() {
    const { keyword, fileTree, showModifications, sizeFilter } = this.state;
    if (!fileTree) {
      return null;
    }
    if (!keyword && !sizeFilter && !showModifications) {
      return fileTree;
    }
    let reg = null;
    if (keyword) {
      try {
        reg = new RegExp(keyword, "gi");
      } catch (err) {
        console.error(err);
      }
    }
    let minSize = 0;
    if (sizeFilter) {
      minSize = bytes.parse(sizeFilter.substring(2));
    }
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
  // 输出layer相关信息
  renderLayerInfo() {
    const { basicInfo, detailCmdID } = this.state;
    const cmdLimit = 24;
    const rows = basicInfo.layerAnalysisList.map(row => {
      let cmd = row.command;
      if (cmd.length > cmdLimit) {
        cmd = cmd.substring(0, cmdLimit) + "...";
      }
      let detailCmd = null;
      if (detailCmdID === row.id) {
        detailCmd = (
          <Paper className="diving-command diving-paper">{row.command}</Paper>
        );
      }

      return (
        <TableRow key={row.id}>
          <TableCell>{row.shortID}</TableCell>
          <TableCell
            align="right"
            style={{
              color: colors.size
            }}
          >
            {bytes.format(row.size)}
          </TableCell>
          <TableCell>
            <IconButton
              key="detail"
              aria-label="Code"
              style={{
                float: "right",
                color: detailCmdID === row.id ? colors.size : null
              }}
              onClick={() => this.toggleDetailCmd(row.id)}
            >
              <CodeIcon />
            </IconButton>
            {detailCmd}
            {cmd}
          </TableCell>
        </TableRow>
      );
    });
    return (
      <Paper className="diving-layers diving-paper">
        {createTitle("[Layers]", "80px")}
        <Table
          style={{
            tableLayout: "fixed"
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Image ID</TableCell>
              <TableCell align="right">Size</TableCell>
              <TableCell>Command</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{rows}</TableBody>
        </Table>
      </Paper>
    );
  }
  // 输出重复文件的信息
  renderInefficiency() {
    const { basicInfo } = this.state;
    const { inefficiencyAnalysisList } = basicInfo;
    if (!inefficiencyAnalysisList || !inefficiencyAnalysisList.length) {
      return null;
    }
    const files = inefficiencyAnalysisList.slice(0);
    files
      .sort((item1, item2) => {
        return item1.cumulativeSize - item2.cumulativeSize;
      })
      .reverse();
    const rows = files.map(file => {
      const size = bytes.format(file.cumulativeSize);
      return (
        <TableRow key={file.path}>
          <TableCell>{file.path}</TableCell>
          <TableCell
            style={{
              color: colors.size
            }}
            align="right"
          >
            {size}
          </TableCell>
          <TableCell align="right">{file.count}</TableCell>
        </TableRow>
      );
    });
    return (
      <Paper className="diving-inefficiency diving-paper">
        {createTitle("[Inefficiency]", "130px")}
        <Table
          style={{
            tableLayout: "fixed"
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>File</TableCell>
              <TableCell align="right">Total Space</TableCell>
              <TableCell align="right">Count</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{rows}</TableBody>
        </Table>
      </Paper>
    );
  }
  // 输出镜像的基本信息
  renderBasicInfo() {
    const { basicInfo } = this.state;
    const efficiency = (basicInfo.efficiency * 100).toFixed(2);
    const infos = [
      {
        desc: "Image efficiency score:",
        value: `${efficiency}%`
      },
      {
        desc: "Total image size:",
        value: bytes.format(basicInfo.sizeBytes)
      },
      {
        desc: "User size:",
        value: bytes.format(basicInfo.userSizeByes)
      },
      {
        desc: "Wasted size:",
        value: bytes.format(basicInfo.wastedBytes) || "0B"
      }
    ];
    return (
      <Grid item sm={5}>
        <Paper className="diving-detail diving-paper">
          {createTitle("[Detail]", "73px")}
          {infos.map(item => {
            return (
              <p key={item.desc}>
                {item.desc}
                <span
                  style={{
                    color: colors.size
                  }}
                >
                  {item.value}
                </span>
              </p>
            );
          })}
        </Paper>
        {this.renderLayerInfo()}
        {this.renderInefficiency()}
      </Grid>
    );
  }
  renderFormControl() {
    const { basicInfo } = this.state;
    const layerMenuItems = basicInfo.layerAnalysisList.map(item => {
      return (
        <MenuItem key={item.id} value={item.shortID}>
          {item.shortID}
        </MenuItem>
      );
    });
    const sizeMenuItems = [
      "none",
      ">=10KB",
      ">=30KB",
      ">=100KB",
      ">=500KB",
      ">=1MB",
      ">=10MB"
    ].map(item => {
      return (
        <MenuItem key={item} value={item}>
          {item}
        </MenuItem>
      );
    });
    const marginLeft = "20px";
    return (
      <form className="diving-control">
        <Tooltip
          className="diving-control-tooltip"
          title={
            <React.Fragment>
              <ul
                className="diving-control-tooltip-colors"
              >
                <li
                  style={{
                    color: colors.added,
                  }}
                >Added Path</li>
                <li
                  style={{
                    color: colors.changed,
                  }}
                >Changed Path</li>
                <li
                  style={{
                    color: colors.removed,
                  }}
                >Removed Path</li>
              </ul>
            </React.Fragment>
          }
        >
          <HelpIcon
            color="action"
          />
        </Tooltip>
        <FormControl>
          <InputLabel htmlFor="layer-select">Layer</InputLabel>
          <Select
            onChange={e => {
              this.showLayer(e.target.value);
            }}
            style={{
              width: "250px"
            }}
            value={this.state.selectedLayer}
          >
            {layerMenuItems}
          </Select>
        </FormControl>
        <FormControl>
          <InputLabel htmlFor="size-select">Size</InputLabel>
          <Select
            onChange={e => {
              let v = e.target.value;
              if (v === "none") {
                v = "";
              }
              this.setState({
                sizeFilter: v
              });
            }}
            style={{
              marginLeft,
              width: "100px"
            }}
            value={this.state.sizeFilter}
          >
            {sizeMenuItems}
          </Select>
        </FormControl>
        <FormControl>
          <Paper
            elevation={1}
            style={{
              boxShadow: "none",
              marginLeft,
              borderRadius: 0,
              borderBottom: "1px solid #999"
            }}
          >
            <InputBase
              value={this.state.keyword}
              placeholder="Keyword(RegExp)"
              onChange={e =>
                this.setState({
                  keyword: e.target.value
                })
              }
            />
            <IconButton
              aria-label="Clear"
              onClick={() => {
                this.setState({
                  keyword: ""
                });
              }}
            >
              <CloseIcon />
            </IconButton>
          </Paper>
        </FormControl>
        <FormControl
          style={{
            marginLeft
          }}
        >
          <FormControlLabel
            label="Show Modifications"
            control={
              <Checkbox
                checked={this.state.showModifications}
                onChange={e => {
                  this.setState({
                    showModifications: !this.state.showModifications
                  });
                }}
              />
            }
          />
        </FormControl>
        <FormControl
          style={{
            marginLeft
          }}
        >
          <FormControlLabel
            label="Expand All"
            control={
              <Checkbox
                checked={this.state.expandAll}
                onChange={e => {
                  this.setState({
                    expandAll: !this.state.expandAll
                  });
                }}
              />
            }
          />
        </FormControl>
      </form>
    );
  }
  // 输出文件树
  renderFileTree() {
    const {
      getTreeStatus,
    } = this.state;
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
                textIndent: `${level * 26}px`
              }}
            >
              {hasChildren && (
                <IconButton
                  style={{
                    padding: 0,
                    color: fontColor,
                    marginRight: "5px"
                  }}
                  onClick={() => this.toggleExpand(level, name)}
                >
                  {!expanded && <BorderInnerIcon fontSize="small" />}
                  {expanded && <BorderClearIcon fontSize="small" />}
                </IconButton>
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
    const fileTree = this.getFileTree();
    let loading = null;
    if (getTreeStatus === loadingStatus) {
      loading = this.getLoading();
    } else if (fileTree) {
      renderFileAnalysis(fileTree, "root", 0);
    } else {
      loading = (
        <p
          style={{
            textAlign: 'center'
          }}
        >
          Get file tree of layer fail
        </p>
      );
    } 
    return (
      <Grid item sm={7}>
        <Paper className="diving-file-tree diving-paper">
          {createTitle("[Current Layer Contents]", "235px")}
          {this.renderFormControl()}
          {fileNodes}
          {loading}
        </Paper>
      </Grid>
    );
  }
  renderResult() {
    const { basicInfo, image } = this.state;
    if (!basicInfo) {
      return null;
    }
    return (
      <div>
        <AppBar
          style={{
            backgroundColor: "#373e5d"
          }}
          position="static"
          className="diving-app-bar"
        >
          <Toolbar
            variant="dense"
            style={{
              padding: 0
            }}
          >
            <Typography
              variant="h6"
              color="inherit"
              style={{
                width: "100%"
              }}
            >
              <IconButton color="inherit" aria-label="DonutLarge">
                <DonutLargeIcon />
              </IconButton>
              {image}
            </Typography>
            <IconButton
              color="inherit"
              aria-label="Close"
              onClick={() => this.goBack()}
            >
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Grid container spacing={0} className="diving-grid">
          {this.renderBasicInfo()}
          {this.renderFileTree()}
        </Grid>
      </div>
    );
  }
  renderError() {
    const { error } = this.state;
    const message = getErrorMessage(error);
    return (
      <Message
        variant={"error"}
        message={message}
        onClose={() => {
          this.setState({
            error: null
          });
        }}
      />
    );
  }
  getLoading() {
    return (
      <div>
        <p className="diving-loading-tips"> Loading...</p>
        <LinearProgress />
      </div>
    );
  }
  renderSearch() {
    const { status, basicInfo } = this.state;
    if (basicInfo) {
      return null;
    }
    let loadingTips = null;

    if (status === loadingStatus) {
      loadingTips = this.getLoading();
    }
    return (
      <div className="diving-main">
        <a
          style={{
            position: "absolute",
            width: "25px",
            height: "25px",
            overflow: "hidden",
            padding: "15px",
            right: 0
          }}
          href="https://github.com/vicanso/diving"
        >
          <svg
            style={{
              fill: "#fff"
            }}
          >
            <path d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z" />
          </svg>
        </a>
        <div className="diving-search">
          <ImageSearch onSearch={name => this.onSearch(name.trim())} />
          {loadingTips}
        </div>
      </div>
    );
  }
  render() {
    return (
      <div className="diving">
        {this.renderSearch()}
        {this.renderResult()}
        {this.renderError()}
      </div>
    );
  }
}

export default App;
