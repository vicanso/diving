import React, { Component } from "react";
import PropTypes from "prop-types";
import bytes from "bytes";
import { Tooltip } from "antd";

import { getFileTypeName } from "./util";

const colors = [
  "#1f8ffb",
  "#54c3c3",
  "#5cc35c",
  "#facd33",
  "#ed4a64",
  "#854ae0"
];

class FileTypeProportion extends Component {
  render() {
    const { data } = this.props;
    const keys = Object.keys(data).sort();
    let count = 0;
    keys.forEach(k => {
      count += data[k];
    });
    const result = [];
    let rest = 100;
    keys.forEach((k, index) => {
      const size = data[k];
      let percent = ((100 * size) / count).toFixed(2);
      if (index === keys.length - 1) {
        percent = rest.toFixed(2);
      } else {
        rest -= percent;
      }
      const color = colors[index % colors.length];
      const name = getFileTypeName(k);
      const title = `${name}'s size is ${bytes.format(size)}(${percent}%)`;
      result.push(
        <Tooltip title={title} key={name}>
          <span
            style={{
              display: "inline-block",
              width: `${percent}%`,
              backgroundColor: color,
              height: "100%"
            }}
            title={name + " proportion"}
          />
        </Tooltip>
      );
    });
    return (
      <div className="diving-file-type-proportion" style={this.props.style}>
        {result}
      </div>
    );
  }
}

FileTypeProportion.propTypes = {
  data: PropTypes.object.isRequired
};

export default FileTypeProportion;
