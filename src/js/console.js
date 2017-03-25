require('../css/console.css');
var React = require('react');
var ReactDOM = require('react-dom');
var util = require('./util');
var FilterInput = require('./filter-input');
var dataCenter = require('./data-center');

var LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
var MAX_COUNT = 360;

module.exports = React.createClass({
  getInitialState: function() {
    return { list: [] };
  },
  addLogs: function(list) {
    if (!list || !list.length) {
      return;
    }
    var con = ReactDOM.findDOMNode(this.refs.console);
    var height = con.offsetHeight;
    var scrollTop = con.scrollTop;
    var atBottom = con.scrollHeight < height + scrollTop + 10;
    list = this.state.list.concat(list);
    var overCount = list.length - MAX_COUNT;
    if (overCount > 0) {
      if (!atBottom) {
        return;
      }
      list = list.slice(overCount);
    }
    this.setState({ list: list }, function() {
      if (atBottom) {
        con.scrollTop = con.scrollHeight;
      }
    });
  },
  componentDidMount: function() {
    var self = this;
    (function loadLogs() {
      if (self.state.list.length > MAX_COUNT) {
        return setTimeout(loadLogs, 1000);
      }
      dataCenter.getLogs({ id: self.lastId }, function(list) {
        self.addLogs(list);
        var log = self.state.list[self.state.list.length - 1];
        self.lastId = log && log.id;
        setTimeout(loadLogs, 1000);
      });
    })();
  },
  shouldComponentUpdate: function(nextProps) {
		var hide = util.getBoolean(this.props.hide);
		return hide != util.getBoolean(nextProps.hide) || !hide;
	},
  autoRefresh: function() {
    var con = ReactDOM.findDOMNode(this.refs.console);
    con.scrollTop = con.scrollHeight;
  },
  clear: function() {
    this.setState({ list: [] });
  },
  onFilterChange: function(val) {
    val = val.trim();
    var list = this.state.list;
    if (!list.length) {
      return;
    }
    // 支持正则及多个关键字
    if (val) {
      list.forEach(function(log) {
        log.hide = log.msg.indexOf(val) === -1;
      });
    } else {
      list.forEach(function(log) {
        log.hide = false;
      });
    }
    this.setState({ list: list });
  },
  render: function() {
    var hide =  this.props.hide ? ' hide' : '';
    var list = this.state.list;

    return (
      <div className={'fill orient-vertical-box' + hide}>
        <div ref="console" className="fill w-console-con">
          <ul className="w-log-list">
            {list.map(function(log) {
              var hide = log.hide ? ' hide' : '';
              return <li key={log.id} className={'w-' + log.level + hide}><pre>{log.msg}</pre></li>;
            })}
          </ul>
        </div>
        <FilterInput onChange={this.onFilterChange} />
      </div>
    );
  }
});
