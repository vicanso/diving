import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';

import Paper from '@material-ui/core/Paper';
import InputBase from '@material-ui/core/InputBase';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import SearchIcon from '@material-ui/icons/Search';
import CloseIcon from '@material-ui/icons/Close'

const styles = {
  root: {
    padding: '2px 4px',
    display: 'flex',
    alignItems: 'center',
    width: 600,
  },
  input: {
    marginLeft: 8,
    flex: 1,
  },
  iconButton: {
    padding: 10,
  },
  divider: {
    width: 1,
    height: 28,
    margin: 4,
  },
};

class CustomizedInputBase extends Component {
  state = {
    image: "",
  }
  onSearch() {
    const { onSearch } = this.props;
    onSearch(this.state.image);
  }
  render() {
    const { classes } = this.props;
    return (
      <Paper className={classes.root} elevation={1}>
        <IconButton className={classes.iconButton} aria-label="Menu">
          <MenuIcon />
        </IconButton>
        <InputBase
          className={classes.input}
          placeholder="Input the name of image"
          value={this.state.image}
          onKeyUp={(e) => {
            if (e.keyCode === 0x0d) {
              this.onSearch()
            }
          }}
          onChange={(e) => this.setState({image: e.target.value})}
        />
        <IconButton
          className={classes.iconButton}
          aria-label="Clear"
          onClick={() => this.setState({
            image: '',
          })}
        >
          <CloseIcon />
        </IconButton>
        <Divider className={classes.divider} />
        <IconButton
          className={classes.iconButton}
          aria-label="Search"
          color="primary"
          onClick={() => this.onSearch()}
        >
          <SearchIcon />
        </IconButton>
      </Paper>
    );
  }
}

CustomizedInputBase.propTypes = {
  classes: PropTypes.object.isRequired,
  onSearch: PropTypes.func.isRequired,
};

// 镜像搜索输入
export default withStyles(styles)(CustomizedInputBase);