/* global PouchDB pouchdbFind */
import autocompleteAlgolia from 'autocomplete.js'
import fuzzyWordsSearch from '../lib/fuzzy-words-search-for-paths'
import wordsBolderify from '../lib/words-bolderify'
import {getClassFromMime} from './File'
import debounce from '../lib/debounce'

// ------------------------------------------------------------------
// -- This module inserts in the Cozy Bar a search input.
// -- autocomplete component : https://github.com/algolia/autocomplete.js
// -- filter and sort  :
// -- data : from pouchDB, synchronized with the server
// ------------------------------------------------------------------

// TODO :
// - test debounce is really working
// - update the list of files when pouchDB is updated
// - deal ellipsis in filename and path displayed in suggestions menu.
// - use a second dataset to add suggestions for applications
// - explore the suggestion formats of Cerebro (js launcher)

const SearchBarCtrler = {}
const MAX_RESULTS = 15
var cozyClient
var T0
var T1
var T2
var T3
var T4

SearchBarCtrler.init = function (newCozyClient) {
  cozyClient = newCozyClient
  // ------------------------------------------------------------------
  // 1/ HTML insertion in the bar
  const searchInput = document.createElement('input')
  searchInput.setAttribute('id', `search-bar-input`)
  searchInput.setAttribute('placeholder', 'Search')
  var target = document.querySelector('.coz-sep-flex')
  const searchBar = document.createElement('div')
  searchBar.setAttribute('id', 'search-bar')
  searchBar.appendChild(searchInput)
  target.parentElement.insertBefore(searchBar, target)

  searchBar.addEventListener('focusin', () => {
    searchBar.classList.add('focus-in')
    if (searchInput.previousValue) {
      autoComplete.setVal(searchInput.previousValue)
      searchInput.setSelectionRange(0, searchInput.value.length)
    }
  }, true)

  searchBar.addEventListener('focusout', function (event) {
    searchBar.classList.remove('focus-in')
    searchInput.previousValue = searchInput.value
    autoComplete.setVal('')
  }, true)

  // ------------------------------------------------------------------
  // 2/ prepare the search function for autocomplete.js
  var currentQuery
  const searchSuggestions = function (query, cb) {
    currentQuery = query
    var T1 = performance.now()
    const results = fuzzyWordsSearch.search(query, MAX_RESULTS)
    var T2 = performance.now()
    console.log('search for "' + query + '" took ' + (T2 - T1) + 'ms')
    cb(results)
  }

  // ------------------------------------------------------------------
  // 3/ initialisation oautocompleteAlgolia('#search-bar-input', { hint: true }, [s
  const autoComplete = autocompleteAlgolia('#search-bar-input', { hint: false, openOnFocus: true, autoselect: true, debug: true }, [
    {
      source: debounce(searchSuggestions, 150),
      templates: {
        suggestion: function (suggestion) {
          let path = suggestion.path
          if (suggestion.path === '') { path = '/' }
          console.log('template')
          var html = `<div class="${getClassFromMime(suggestion)} ac-suggestion-img"></div><div><div class="ac-suggestion-name">${wordsBolderify(currentQuery, suggestion.name)}</div class="aa-text-container"><div class="ac-suggestion-path">${wordsBolderify(currentQuery, path)}</div></div>`
          return html
        }
      }
    }
  ]).on('autocomplete:selected', function (event, suggestion, dataset) {
    // a suggestion has been clicked by the user : change the displayed directory
    let path = suggestion.path
    if (suggestion.type === 'directory') {
      path += '/' + suggestion.name
    }
    cozyClient.files.statByPath(path)
    .then(data => {
      window.location.href = '#/files/' + data._id
      searchInput.value = ''
    }).catch(() => {
      searchInput.value = ''
    })
  // }).on('autocomplete:open', function () {
  //   console.log("autocomplete:open");
  // }).on('autocomplete:shown', function () {
  //   console.log("autocomplete:shown");
  // }).on('autocomplete:empty', function () {
  //   console.log("autocomplete:empty");
  // }).on('autocomplete:closed', function () {
  //   console.log("autocomplete:closed");
  // }).on('autocomplete:updated', function () {
  //   console.log("autocomplete:updated");
  }).autocomplete

  // ------------------------------------------------------------------
  // 4/ DATA : replicate the file doctype and then prepare the list
  // of paths for the search.

  var
    fileDB

  const list = []
  const root = document.querySelector('[role=application]')
  const data = root.dataset
  // const initialData = {
  //   cozyDomain: data.cozyDomain,
  //   cozyToken: data.cozyToken
  // }
  window.PouchDB = PouchDB
  window.pouchdbFind = pouchdbFind
  cozyClient.init({
    cozyURL: '//' + data.cozyDomain,
    token: data.cozyToken
  })

  const replicationOptions = {
    onError: () => { console.log('error during pouchDB replication') },
    onComplete: () => {
      const dirDictionnary = {}
      const fileList = []
      fileDB = cozyClient.offline.getDatabase('io.cozy.files')
      T1 = performance.now()
      console.log('first replication took "' + (T1 - T0) + 'ms')
      fileDB.allDocs({include_docs: true, descending: true}, function (e, docs) {
        T2 = performance.now()
        console.log('get all docs took "' + (T2 - T1) + 'ms')
        for (let row of docs.rows) {
          if (row.doc.type === 'file') {
            fileList.push(row.doc)
            list.push(row.doc)
          } else if (row.doc.type === 'directory') {
            let fullPath = row.doc.path
            dirDictionnary[row.id] = fullPath
            // in couch, the path of a directory includes the directory name, what is
            // inconsistent with the file path wich doesn't include the filename.
            // Therefore we harmonize here by removing the dirname from the path.
            row.doc.path = fullPath.substring(0, fullPath.lastIndexOf('/'))
            list.push(row.doc)
          }
        }
        for (let file of fileList) {
          // file.dirPath = dirDictionnary[file.dir_id]
          file.path = dirDictionnary[file.dir_id]
        }
        T3 = performance.now()
        console.log('prepare the file paths took "' + (T3 - T2) + 'ms')
        fuzzyWordsSearch.init(list)
        T4 = performance.now()
        console.log('init of the search took "' + (T4 - T3) + 'ms')
      })
    }
  }

  T0 = performance.now()
  cozyClient.offline.replicateFromCozy('io.cozy.files', replicationOptions)
}

export default SearchBarCtrler
