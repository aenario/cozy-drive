/* global __DEVELOPMENT__, cozy */

import 'babel-polyfill'

import './styles/main'

import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import { Router, hashHistory } from 'react-router'
import { I18n } from 'cozy-ui/react/I18n'
import { shouldEnableTracking, getTracker } from 'cozy-ui/react/helpers/tracker'

import AppRoute from './components/AppRoute'
import configureStore from './store/configureStore'

// ------------------------------------------------------------------
// -- BJA : for the hacked search-bar
import SearchBar from './components/SearchBar'
// -- \BJA
// ------------------------------------------------------------------


if (__DEVELOPMENT__) {
  // Enables React dev tools for Preact
  // Cannot use import as we are in a condition
  require('preact/devtools')

  // Export React to window for the devtools
  window.React = React
}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[role=application]')
  const data = root.dataset

  cozy.client.init({
    cozyURL: '//' + data.cozyDomain,
    token: data.cozyToken
  })

  cozy.bar.init({
    appName: data.cozyAppName,
    appEditor: data.cozyAppEditor,
    iconPath: data.cozyIconPath,
    lang: data.cozyLocale,
    replaceTitleOnMobile: true
  })

  let history = hashHistory
  if (shouldEnableTracking() && getTracker()) {
    let trackerInstance = getTracker()
    history = trackerInstance.connectToHistory(hashHistory)
    trackerInstance.track(hashHistory.getCurrentLocation()) // when using a hash history, the initial visit is not tracked by piwik react router
  }

  const store = configureStore()

  render((
    <I18n lang={data.cozyLocale} dictRequire={(lang) => require(`./locales/${lang}`)}>
      <Provider store={store}>
        <Router history={history} routes={AppRoute} />
      </Provider>
    </I18n>
  ), root)

  // ------------------------------------------------------------------
  // -- BJA : fort the hacked search-bar
  // insert a hacked search field in the cozy bar
  setTimeout(() => { SearchBar.init(cozy.client) }, 200)
  // -- \BJA
  // ------------------------------------------------------------------

})
