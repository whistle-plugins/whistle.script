require('../css/console.css');
var React = require('react');
var util = require('./util');
var FilterInput = require('./filter-input');
var LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

module.exports = React.createClass({
  getInitialState: function() {
    return { list: [] };
  },
  componentDidMount: function() {
    this.setState({
      list: [
        JSON.stringify({
          test: 123,
          abc: 321,
          efg: 123456
        }, null, '  '),
        '-----------------------sssssss',
        '===========fffffffffffffffffffff',
        '0000000000000000000000000000000'
      ]
    });
  },
  shouldComponentUpdate: function(nextProps) {
		var hide = util.getBoolean(this.props.hide);
		return hide != util.getBoolean(nextProps.hide) || !hide;
	},
  onFilterChange: function(val) {
    console.log(val);
  },
  render: function() {
    var hide =  this.props.hide ? ' hide' : '';
    var list = this.state.list;

    return (
      <div className={'fill orient-vertical-box' + hide}>
        <div className="fill w-console-con">
          <ul className="w-log-list">
            {list.map(function(log) {
              if (log === undefined) {
                return;
              }
              if (!log || typeof log === 'string') {
                return <li className="w-info"><pre>{log}</pre></li>;
              }
              var level = LEVELS.indexOf(log.level) === -1 ? 'w-info' : 'w-' + log.level;
              return <li className={level}><pre>{log.msg}</pre></li>;
            })}
          </ul>
        </div>
        <FilterInput onChange={this.onFilterChange} />
      </div>
    );
  }
});
