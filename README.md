react-hmr
======

[![Dependency Status](https://david-dm.org/wuhy/react-hmr.svg)](https://david-dm.org/wuhy/react-hmr) [![devDependency Status](https://david-dm.org/wuhy/react-hmr/dev-status.svg)](https://david-dm.org/wuhy/react-hmr#info=devDependencies) [![NPM Version](https://img.shields.io/npm/v/react-hmr.svg?style=flat)](https://npmjs.org/package/react-hmr)

> The AMD wrapper of react-hot-loader@next for react HMR

## How to use

### Install

```shell
npm install react-hmr --save-dev
```
### Usage

* DEV ENV

    1. Preload `dist/react-hot-loader.dev.js` or `dist/react-hot-loader.dev.min.js` compress version
    
    2. Update your React app entry code:
    
        * import/require `patch` and `AppContainer` as the React.Component proxy, the `patch` should execute before the app startup
        * use the `AppContainer` component wrap your app root component
        
        ```javascript
        import patch from 'react-hot-loader/patch';
        import AppContainer from 'react-hot-loader/lib/AppContainer';
        
        import React from 'react';
        import ReactDOM from 'react-dom';
        import App from './App';
        
        const store = {
            name: 'react'
        };
        ReactDOM.render(
            <AppContainer>
                <App></App>
            </AppContainer>,
            document.getElementById('app')
        );
        ```

* PROD ENV
    
    Like `DEV ENV`, except for preload `dist/react-hot-loader.prod.js` or `dist/react-hot-loader.prod.min.js` compress version.
      
### Reference

* [react-hot-loader](https://github.com/gaearon/react-hot-loader): the next version
* The next react-hot-loader [upgrade example](https://github.com/gaearon/redux-devtools/commit/64f58b7010a1b2a71ad16716eb37ac1031f93915)

