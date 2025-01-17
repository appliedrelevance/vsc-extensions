// @ts-check
/* eslint-disable @typescript-eslint/naming-convention */

'use strict';

const shared = require('./shared');

module.exports = {
  names: ['AM022', 'header-anchor-collision'],
  description: 'Heading anchor has collision',
  tags: ['headings', 'headers'],
  function: function AM022(params, onError) {
    var anchors = {}; //explicit anchors
    var collision = {};

    /* loop one to get list of all anchors */
    shared.forEachHeading(params, function forHeading(heading, content) {
      var linenumber = heading.lineNumber;
      var headingtitle = heading.line
        .replace(/^[#]+ /, '')
        .replace(/[\s]*\{\#.*?\}[\s]*$/, '');
      var hasanchor = heading.line.search(/\{#.*?\}[\s]*$/) >= 0;
      var anchorid = heading.line.replace(/^.*?[\s]*\{\#(.*?)\}[\s]*$/, '$1');
      var sluganchorid = '';
      var key = '';

      headingtitle = headingtitle.replace(/\[!DNL (.*?)]/, '$1');
      headingtitle = headingtitle.replace(/\[!UICONTROL (.*?)]/, '$1');

      if (!hasanchor) {
        anchorid = '';
        sluganchorid = shared.slugify(headingtitle);
        if (!(sluganchorid in collision)) {
          collision[sluganchorid] = 1;
        }
        if (sluganchorid in anchors) {
          collision[sluganchorid] = collision[sluganchorid] + 1;
          sluganchorid =
            sluganchorid + '-' + collision[sluganchorid].toString();
        }
      }
      key = anchorid ? anchorid : sluganchorid;

      if (!(key in anchors)) {
        anchors[key] = [];
      }
      anchors[key].push({
        anchorid: anchorid,
        slug: sluganchorid,
        linenumber: linenumber,
      });
    });

    for (const [key, value] of Object.entries(anchors)) {
      if (value.length > 1) {
        for (const [_, value2] of Object.entries(value)) {
          var anchortype = value2.slug ? ' (autogenerated) ' : '';
          shared.addError(
            onError,
            value2.linenumber,
            null,
            'Duplicate anchor ' + anchortype + "'" + key + "'"
          );
        }
      }
    }
  },
};
