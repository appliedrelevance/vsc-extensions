# How to develop adobe-markdown-authoring

Developing the Adobe Markdown Authoring Extension for Visual Studio Code.

This extension is influenced by the [VSCode Docs Authoring]](https://github.com/microsoft/vscode-docs-authoring) package 
from Microsoft. It is no longer supported by Microsoft, but it is still a good example of how to develop a VSCode 
extension for Markdown. 

## Features

This extension provides the following features:

* Support for Adobe Flavored Markdown (AFM) in VSCode
* Linting (syntax and style checking) for AFM
* Preview of styled AFM in VSCode using Markdown-It plugins to transform AFM to HTML.
* Support for Adobe Spectrum CSS in VSCode to style the preview of AFM.
* Keyboard and menu shortcuts for AFM elements.

## Prerequisites

Since this is a Visual Studio Code extension, you need to have Visual Studio Code installed. You can download it from
[Microsoft](https://code.visualstudio.com/).

* [Visual Studio Code](https://code.visualstudio.com/)
* [Node.js](https://nodejs.org/en/) (version 10.0.0 or later)
* [Yarn](https://yarnpkg.com/en/) (version 1.0.0 or later)
* [Git](https://git-scm.com/)

## Developer Examples

You can find examples for testing features of the extension at [vsc-extensions-test-files](https://github.com/appliedrelevance/vsc-extensions-test-files)

