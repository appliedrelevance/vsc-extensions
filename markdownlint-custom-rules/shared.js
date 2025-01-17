'use strict';

// Regular expression for matching common newline characters
// See NEWLINES_RE in markdown-it/lib/rules_core/normalize.js
module.exports.newLineRe = /\r[\n\u0085]?|[\n\u2424\u2028\u0085]/;

// Regular expression for matching common front matter (YAML and TOML)
module.exports.frontMatterRe = /^(---|\+\+\+)$[^]*?^\1$(\r\n|\r|\n)/m;

// Regular expression for matching inline disable/enable comments
const inlineCommentRe =
  /<!--\s*markdownlint-(dis|en)able((?:\s+[a-z0-9_-]+)*)\s*-->/gi;
module.exports.inlineCommentRe = inlineCommentRe;

// Regular expressions for range matching
module.exports.atxHeadingSpaceRe = /^#+\s*\S/;
module.exports.bareUrlRe = /(?:http|ftp)s?:\/\/[^\s]*/i;
module.exports.listItemMarkerRe = /^[\s>]*(?:[*+-]|\d+[.)])\s+/;
module.exports.orderedListItemMarkerRe = /^[\s>]*0*(\d+)[.)]/;

// readFile options for reading with the UTF-8 encoding
module.exports.utf8Encoding = { encoding: 'utf8' };

// Trims whitespace from the left (start) of a string
function trimLeft(str) {
  return str.replace(/^\s*/, '');
}
module.exports.trimLeft = trimLeft;

// Trims whitespace from the right (end) of a string
module.exports.trimRight = function trimRight(str) {
  return str.replace(/\s*$/, '');
};

// Applies key/value pairs from src to dst, returning dst
function assign(dst, src) {
  Object.keys(src).forEach(function forKey(key) {
    dst[key] = src[key];
  });
  return dst;
}
module.exports.assign = assign;

// Clones the key/value pairs of obj, returning the clone
module.exports.clone = function clone(obj) {
  return assign({}, obj);
};

// Returns true iff the input is a number
module.exports.isNumber = function isNumber(obj) {
  return typeof obj === 'number';
};

// Returns true iff the input is a string
module.exports.isString = function isString(obj) {
  return typeof obj === 'string';
};

// Returns true iff the input string is empty
module.exports.isEmptyString = function isEmptyString(str) {
  return str.length === 0;
};

// Replaces the text of all properly-formatted HTML comments with whitespace
// This preserves the line/column information for the rest of the document
// Trailing whitespace is avoided with a '\' character in the last column
// See https://www.w3.org/TR/html5/syntax.html#comments for details
const htmlCommentBegin = '<!--';
const htmlCommentEnd = '-->';
module.exports.clearHtmlCommentText = function clearHtmlCommentText(text) {
  let i = 0;
  while ((i = text.indexOf(htmlCommentBegin, i)) !== -1) {
    let j = text.indexOf(htmlCommentEnd, i);
    if (j === -1) {
      j = i; // text.length;
      text += '\\';
    }
    const comment = text.slice(i + htmlCommentBegin.length, j);
    if (
      comment.length > 0 &&
      comment[0] !== '>' &&
      comment[comment.length - 1] !== '-' &&
      comment.indexOf('--') === -1 &&
      text.slice(i, j + htmlCommentEnd.length).search(inlineCommentRe) === -1
    ) {
      const blanks = comment
        .replace(/[^\r\n]/g, ' ')
        .replace(/ ([\r\n])/g, '\\$1');
      text =
        text.slice(0, i + htmlCommentBegin.length) + blanks + text.slice(j);
    }
    i = j + htmlCommentEnd.length;
  }
  return text;
};

// Escapes a string for use in a RegExp
module.exports.escapeForRegExp = function escapeForRegExp(str) {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
};

// Returns the indent for a token
function indentFor(token) {
  const line = token.line.replace(/^[\s>]*(> |>)/, '');
  return line.length - trimLeft(line).length;
}
module.exports.indentFor = indentFor;

// Returns the heading style for a heading token
module.exports.headingStyleFor = function headingStyleFor(token) {
  if (token.map[1] - token.map[0] === 1) {
    if (/[^\\]#\s*$/.test(token.line)) {
      return 'atx_closed';
    }
    return 'atx';
  }
  return 'setext';
};

// Calls the provided function for each matching token
function filterTokens(params, type, callback) {
  params.tokens.forEach(function forToken(token) {
    if (token.type === type) {
      callback(token);
    }
  });
}
module.exports.filterTokens = filterTokens;

let tokenCache = null;
// Caches line metadata and flattened lists for reuse
function makeTokenCache(params) {
  if (!params) {
    tokenCache = null;
    return;
  }

  // Populate line metadata array
  const lineMetadata = new Array(params.lines.length);
  let fenceStart = null;
  let inFence = false;
  // Find fenced code by pattern (parser ignores "``` close fence")
  params.lines.forEach(function forLine(line, lineIndex) {
    let metadata = 0;
    const match = /^[ ]{0,3}(`{3,}|~{3,})/.exec(line);
    const fence = match && match[1];
    if (
      fence &&
      (!inFence || fence.substr(0, fenceStart.length) === fenceStart)
    ) {
      metadata = inFence ? 2 : 6;
      fenceStart = inFence ? null : fence;
      inFence = !inFence;
    } else if (inFence) {
      metadata = 1;
    }
    lineMetadata[lineIndex] = metadata;
  });
  // Find code blocks normally
  filterTokens(params, 'code_block', function forToken(token) {
    for (let i = token.map[0]; i < token.map[1]; i++) {
      lineMetadata[i] = 1;
    }
  });
  // Find tables normally
  filterTokens(params, 'table_open', function forToken(token) {
    for (let i = token.map[0]; i < token.map[1]; i++) {
      lineMetadata[i] += 8;
    }
  });

  // Flatten lists
  const flattenedLists = [];
  const stack = [];
  let current = null;
  let lastWithMap = { map: [0, 1] };
  params.tokens.forEach(function forToken(token) {
    if (
      token.type === 'bullet_list_open' ||
      token.type === 'ordered_list_open'
    ) {
      // Save current context and start a new one
      stack.push(current);
      current = {
        unordered: token.type === 'bullet_list_open',
        parentsUnordered:
          !current || (current.unordered && current.parentsUnordered),
        open: token,
        indent: indentFor(token),
        parentIndent: (current && current.indent) || 0,
        items: [],
        nesting: stack.length - 1,
        lastLineIndex: -1,
        insert: flattenedLists.length,
      };
    } else if (
      token.type === 'bullet_list_close' ||
      token.type === 'ordered_list_close'
    ) {
      // Finalize current context and restore previous
      current.lastLineIndex = lastWithMap.map[1];
      flattenedLists.splice(current.insert, 0, current);
      delete current.insert;
      current = stack.pop();
    } else if (token.type === 'list_item_open') {
      // Add list item
      current.items.push(token);
    } else if (token.map) {
      // Track last token with map
      lastWithMap = token;
    }
  });

  // Cache results
  tokenCache = {
    params: params,
    lineMetadata: lineMetadata,
    flattenedLists: flattenedLists,
  };
}
module.exports.makeTokenCache = makeTokenCache;

// Calls the provided function for each line (with context)
module.exports.forEachLine = function forEachLine(callback) {
  // Invoke callback
  if (!tokenCache) {
    makeTokenCache(null);
  }
  if (tokenCache) {
    tokenCache.params.lines.forEach(function forLine(line, lineIndex) {
      const metadata = tokenCache.lineMetadata[lineIndex];
      callback(
        line,
        lineIndex,
        !!(metadata & 7),
        ((metadata & 6) >> 1 || 2) - 2,
        !!(metadata & 8)
      );
    });
  }
};

// Calls the provided function for each specified inline child token
module.exports.forEachInlineChild = function forEachInlineChild(
  params,
  type,
  callback
) {
  filterTokens(params, 'inline', function forToken(token) {
    token.children.forEach(function forChild(child) {
      if (child.type === type) {
        callback(child, token);
      }
    });
  });
};

// Calls the provided function for each heading's content
module.exports.forEachHeading = function forEachHeading(params, callback) {
  let heading = null;
  params.tokens.forEach(function forToken(token) {
    if (token.type === 'heading_open') {
      heading = token;
    } else if (token.type === 'heading_close') {
      heading = null;
    } else if (token.type === 'inline' && heading) {
      callback(heading, token.content);
    }
  });
};

// Returns (nested) lists as a flat array (in order)
module.exports.flattenLists = function flattenLists() {
  return tokenCache.flattenedLists;
};

// Adds a generic error object via the onError callback
function addError(onError, lineNumber, detail, context, range) {
  onError({
    lineNumber: lineNumber,
    detail: detail,
    context: context,
    range: range,
  });
}
module.exports.addError = addError;

// Adds an error object with details conditionally via the onError callback
module.exports.addErrorDetailIf = function addErrorDetailIf(
  onError,
  lineNumber,
  expected,
  actual,
  detail,
  range
) {
  if (expected !== actual) {
    addError(
      onError,
      lineNumber,
      'Expected: ' +
        expected +
        '; Actual: ' +
        actual +
        (detail ? '; ' + detail : ''),
      null,
      range
    );
  }
};

// Adds an error object with context via the onError callback
module.exports.addErrorContext = function addErrorContext(
  onError,
  lineNumber,
  context,
  left,
  right,
  range
) {
  if (context.length <= 30) {
    // Nothing to do
  } else if (left && right) {
    context = context.substr(0, 15) + '...' + context.substr(-15);
  } else if (right) {
    context = '...' + context.substr(-30);
  } else {
    context = context.substr(0, 30) + '...';
  }
  addError(onError, lineNumber, null, context, range);
};

module.exports.addWarningContext = function addWarningContext(
  filename,
  linenumber,
  line,
  rule
) {
  if (line.length <= 30) {
    // Nothing to do
  } else {
    line = line.substr(0, 30) + '...';
  }
  console.log(
    '[WARN] ' + filename + ': ' + linenumber + ': ' + rule + ': ' + line
  );
};

// Returns a range object for a line by applying a RegExp
module.exports.rangeFromRegExp = function rangeFromRegExp(line, regexp) {
  let range = null;
  const match = line.match(regexp);
  if (match) {
    let column = match.index + 1;
    let length = match[0].length;
    if (match[2]) {
      column += match[1].length;
      length -= match[1].length;
    }
    range = [column, length];
  }
  return range;
};

// Check if we are in a code block
module.exports.inCodeBlock = function inCodeBlock(line, incode) {
  const codeBlockRe = new RegExp('```');
  const htmlCodeBlockRe = new RegExp('<');
  var incodeblock = incode;
  const codeBlockMatch = codeBlockRe.exec(line);
  if (codeBlockMatch) {
    incodeblock = !incodeblock;
  }
  return incodeblock;
};
