import React, { Component } from 'react';
import './App.css';
import ImageSearch from './ImageSearch';
import LinearProgress from '@material-ui/core/LinearProgress';
import axios from 'axios';
import { Grid, Table, TableRow, TableCell, TableHead, TableBody } from '@material-ui/core';
import Paper from '@material-ui/core/Paper';
import bytes from 'bytes';
import CodeIcon from '@material-ui/icons/Code';
import IconButton from '@material-ui/core/IconButton'
import Message from './Message';

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
    detailCmdID: '',
    error: null,
    basicInfo: null,
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
      } = await axios.get(`/api/images/${name}`)
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
    } catch (err) {
      this.setState({
        error: err,
        status: '',
      });
    }
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
      <Paper className="diving-layers">
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
            align="right"
          >{size}</TableCell>
        </TableRow>
      );
    });
    return (
      <Paper className="diving-inefficiency">
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
              >Size</TableCell>
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
    return (
      <Grid
        item
        sm={6}
      >
        {this.renderLayerInfo()}
        {this.renderInefficiency()}
      </Grid>
    )
  }
  renderFileTree() {
    return (
      <Grid
        item
        sm={6}
      >
      </Grid>
    )
  }
  renderResult() {
    const {
      basicInfo,
    } = this.state
    if (!basicInfo) {
      return null;
    }
    return (
      <Grid container spacing={0}>
        {this.renderBasicInfo()}
        {this.renderFileTree()}
      </Grid>
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
            onSearch={(name) => this.getBasicInfo(name.trim())}
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
