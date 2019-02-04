import React, { Component } from 'react';
import './App.css';
import ImageSearch from './ImageSearch';
import LinearProgress from '@material-ui/core/LinearProgress';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import axios from 'axios';

function getErrorMessage(err) {
  if (!err) {
    return ""
  }
  if (err.response) {
    return err.response.data.message;
  }
  return err.message;
}

class App extends Component {
  state = {
    status: '',
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
  renderSearch() {
    const {
      status,
      error,
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
        <Dialog
          open={error !== null}
          onClose={() => this.setState({
            error: null,
          })}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle>
            {"Get image's information fail"}
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              {getErrorMessage(error)}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => this.setState({
                error: null,
              })}
              color="primary"
              autoFocus
            >
              OK
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    )
  }
  render() {
    return (
      <div className="diving">
        {this.renderSearch()}
      </div>
    );
  }
}

export default App;
