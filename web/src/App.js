import React, { Component } from 'react';
import './App.css';
import ImageSearch from './ImageSearch';
import LinearProgress from '@material-ui/core/LinearProgress';
import axios from 'axios';
import { Grid, Table, TableRow, TableCell, TableHead, TableBody } from '@material-ui/core';
import Paper from '@material-ui/core/Paper';
import AppBar from '@material-ui/core/AppBar';
import bytes from 'bytes';
import CodeIcon from '@material-ui/icons/Code';
import CloseIcon from '@material-ui/icons/Close';
import IconButton from '@material-ui/core/IconButton'
import BorderInnerIcon from '@material-ui/icons/BorderInner';
import BorderClearIcon from '@material-ui/icons/BorderClear';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import DonutLargeIcon from '@material-ui/icons/DonutLarge';

import Message from './Message';

const sizeColor = '#1a237e';

function getErrorMessage(err) {
  if (!err) {
    return ""
  }
  if (err.response) {
    return err.response.data.message;
  }
  return err.message;
}

function createTitle(title, left) {
  return (
    <div
      style={{
        lineHeight: '40px',
        position: 'relative',
        fontSize: '16px',
        color: '#333',
      }} 
    >
      <h3
        style={{
          margin: 0,
          fontWeight: 600,
        }}
      >{title}</h3>
      <div
        style={{
          borderBottom: '1px solid rgba(80, 80, 80, 0.85)',
          position: 'absolute',
          left: left,
          right: 0,
          top: '50%',
          marginTop: '1px',
        }}
      ></div>
    </div>
  )
}

class App extends Component {
  state = {
    status: '',
    image: '',
    detailCmdID: '',
    error: null,
    basicInfo: null,
    expands: [],
    expandAll: false,
    fileTree: null,
  }
  async getTree(layer = 0) {
    const {
      image,
    } = this.state;
    this.setState({
      error: null,
    });
    try {
      const res = await axios.get(`/api/images/tree/${image}?layer=${layer}`)
      this.setState({
        fileTree: res.data,
      });
    } catch (err) {
      this.setState({
        error: err,
      });
    }
  }
  async getBasicInfo(name, times = 0) {
    if (!name) {
      return
    }
    this.setState({
      status: 'loading',
    })
    try {
      if (times > 3) {
        throw new Error('Timeout, please try again later.')
      }
      const {
        status,
        data,
      } = await axios.get(`/api/images/detail/${name}`)
      if (status === 202) {
        setTimeout(() => {
          this.getBasicInfo(name, times + 1);
        }, 5000);
        return;
      }
      this.setState({
        status: '',
        basicInfo: data,
      });
      this.getTree(1);
    } catch (err) {
      this.setState({
        error: err,
        status: '',
      });
    }
  }
  findExpandIndex(level, name) {
    const {
      expands,
    } = this.state;
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
  toggleExpand(level, name) {
    const {
      expands,
    } = this.state;
    const index = this.findExpandIndex(level, name);
    if (index !== -1) {
      expands.splice(index, 1);
    } else {
      expands.push({
        level,
        name,
      });
    }
    this.setState({
      expands,
    });
  }
  shouldExpand(level, name) {
    const {
      expandAll,
    } = this.state;
    if (expandAll) {
      return true;
    }
    return this.findExpandIndex(level, name) !== -1
  }
  toggleDetailCmd(id) {
    const {
      detailCmdID,
    } = this.state;
    if (id !== detailCmdID) {
      this.setState({
        detailCmdID: id,
      });
      return;
    }
    this.setState({
      detailCmdID: '',
    });
  }
  onSearch(image) {
    if (!image) {
      return;
    }
    this.setState({
      image,
    });
    this.getBasicInfo(image);
  }
  goBack() {
    this.setState({
      basicInfo: null,
      expandAll: false,
      expands: [],
      fileTree: null,
    });
  }
  renderLayerInfo() {
    const {
      basicInfo,
      detailCmdID,
    } = this.state;
    const cmdLimit = 24;
    const rows = basicInfo.layerAnalysisList.map((row) => {
      let cmd = row.command;
      if (cmd.length > cmdLimit) {
        cmd = cmd.substring(0, cmdLimit) + '...';
      }
      let detailCmd = null;
      if (detailCmdID === row.id) {
        detailCmd = (
          <Paper
            className="diving-command"
          >
            {row.command}
          </Paper>
        );
      }

      return (
        <TableRow key={row.id}>
          <TableCell>{row.shortID}</TableCell>
          <TableCell
            align="right"
            style={{
              color: sizeColor,
            }}
          >{bytes.format(row.size)}</TableCell>
          <TableCell
          >
            <IconButton
              key="detail"
              aria-label="Code"
              style={{
                float: 'right',
              }}
              onClick={() => this.toggleDetailCmd(row.id)}
            >
              <CodeIcon />
            </IconButton>
            {detailCmd}
            {cmd}
          </TableCell>
        </TableRow>
      )
    });
    return (
      <Paper className="diving-infos diving-layers">
        {createTitle("[Layers]", '80px')}
        <Table
          style={{
            tableLayout: 'fixed',
          }}
        >
          <TableHead><TableRow>
            <TableCell>Image ID</TableCell>
            <TableCell
              align="right"
            >Size</TableCell>
            <TableCell>Command</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {rows}
          </TableBody>
        </Table>
      </Paper>
    );
  }
  renderInefficiency() {
    const {
      basicInfo,
    } = this.state;
    const {
      inefficiencyAnalysisList,
    } = basicInfo;
    if (!inefficiencyAnalysisList || !inefficiencyAnalysisList.length) {
      return null;
    }
    const files = inefficiencyAnalysisList.slice(0);
    files.sort((item1, item2) => {
      return item1.cumulativeSize - item2.cumulativeSize;
    }).reverse();
    const rows = files.map((file) => {
      const size = bytes.format(file.cumulativeSize);
      return (
        <TableRow key={file.path}>
          <TableCell>{file.path}</TableCell>
          <TableCell
            style={{
              color: sizeColor,
            }}
            align="right"
          >{size}</TableCell>
          <TableCell
            align="right"
          >{file.count}</TableCell>
        </TableRow>
      );
    });
    return (
      <Paper className="diving-infos diving-inefficiency">
        {createTitle("[Inefficiency]", '130px')}
        <Table
          style={{
            tableLayout: 'fixed',
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>File</TableCell>
              <TableCell
                align="right"
              >Total Space</TableCell>
              <TableCell
                align="right"
              >Count</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows}
          </TableBody>
        </Table>
      </Paper>
    )
  }
  renderBasicInfo() {
    const {
      basicInfo,
    } = this.state;
    const efficiency = (basicInfo.efficiency * 100).toFixed(2);
    const infos = [
      {
        desc: 'Image efficiency:',
        value: `${efficiency}%`,
      },
      {
        desc: 'Image size:',
        value: bytes.format(basicInfo.sizeBytes),
      },
      {
        desc: 'User size:',
        value: bytes.format(basicInfo.userSizeByes),
      },
      {
        desc: 'Wasted size:',
        value: bytes.format(basicInfo.wastedBytes),
      },
    ];
    return (
      <Grid
        item
        sm={6}
      >
        <Paper className="diving-infos diving-detail">
          {createTitle("[Detail]", '73px')}
          {
            infos.map((item) => {
              return (
                <p
                  key={item.desc}
                >
                  {item.desc}
                  <span
                    style={{
                      color: sizeColor,
                    }}
                  >{item.value}</span>
                </p>
              );
            })
          }
        </Paper>
        {this.renderLayerInfo()}
        {this.renderInefficiency()}
      </Grid>
    )
  }
  renderFileTree() {
    const {
      fileTree,
    } = this.state;
    if (!fileTree) {
      return null;
    }

    const fileNodes = [];
    fileNodes.push(
      <div
        key={'fields'}
        className="diving-file-tree-item"
      >
        <span
          className="mode"
        >Permission</span>
        <span
          className="ids"
        >UID:GID</span>
        <span
          className="size"
        >Size</span>
        <span
        >FileTree</span>
      </div>
    );
    const renderFileAnalysis = (tree, prefix, level) => {
      if (!tree.children ||tree.children.length === 0) {
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
        if (mode && mode.charAt(0) === 'L') {
          mode = '-' + mode.substring(1);
        }
        const hasChildren = item.children && item.children.length !== 0;
        const expanded = this.shouldExpand(level, k);

        fileNodes.push(
          <div
            className="diving-file-tree-item"
            key={`${prefix}-${k}`}
          >
            <span
              className="mode"
            >{mode}</span>
            <span
              className="ids"
            >{item.ids}</span>
            <span
              className="size"
            >{size}</span>
            <span
              style={{
                textIndent: `${level*26}px`,
              }}
            >
              {hasChildren && <IconButton
                style={{
                  padding: 0,
                  color: '#fff',
                  marginRight: '5px',
                }}
                onClick={() => this.toggleExpand(level, name)}
              >
                {!expanded && <BorderInnerIcon
                  fontSize="small"
                />}
                {expanded &&<BorderClearIcon
                  fontSize="small"
                />}
              </IconButton>}
              {name}
            </span>
          </div>
        );
        if (hasChildren && expanded) {
          renderFileAnalysis(item, `${prefix}-${k}`, level + 1);
        }
      });
    };

    renderFileAnalysis(fileTree, "root", 0)
    return (
      <Grid
        item
        sm={6}
        className="diving-file-tree"
      >
        {fileNodes}
      </Grid>
    )
  }
  renderResult() {
    const {
      basicInfo,
      image,
    } = this.state;
    if (!basicInfo) {
      return null;
    }
    return (
      <div>
      <AppBar
        position="static"
        className="diving-app-bar"
      >
        <Toolbar variant="dense">
          <Typography
            variant="h6"
            color="inherit"
            style={{
              width: '100%',
            }}
          >
            <IconButton
              color="inherit"
              aria-label="DonutLarge"
            >
              <DonutLargeIcon />
            </IconButton>
            {image.toUpperCase()}
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
        <Grid container spacing={0}
          className="diving-grid"
        >
          {this.renderBasicInfo()}
          {this.renderFileTree()}
        </Grid>
      </div>
    )
  }
  renderError() {
    const {
      error,
    } = this.state;
    if (!error) {
      return null;
    }
    return (
      <Message
        variant={"error"}
        message={getErrorMessage(error)}
      />
    )
  }
  renderSearch() {
    const {
      status,
      basicInfo,
    } = this.state
    if (basicInfo) {
      return null;
    }
    let loadingTips = null;
    
    if (status === 'loading') {
      loadingTips = (<div>
        <p
          className="diving-loading-tips"
        > Loading...</p>
        <LinearProgress /> 
      </div>)
    }
    return (
      <div className="diving-search">
        <div>
          <ImageSearch
            onSearch={(name) => this.onSearch(name.trim())}
          />
          { loadingTips }
        </div>
      </div>
    )
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
