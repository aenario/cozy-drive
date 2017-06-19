import autocompleteAlgolia from 'autocomplete.js'
import fuzzaldrinPlus from 'fuzzaldrin-plus'

// ------------------------------------------------------------------
// -- This module inserts in the Cozy Bar a search input.
// -- autocomplete component :
// -- filter and sort  :
// -- data : static in the source code
// ------------------------------------------------------------------

const SearchBarCtrler = {}

SearchBarCtrler.init = function (cozyClient) {
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
      searchInput.value = searchInput.previousValue
      searchInput.setSelectionRange(0, searchInput.value.length)
    }
  }, true)

  searchBar.addEventListener('focusout', function (event) {
    searchBar.classList.remove('focus-in')
    searchInput.previousValue = searchInput.value
    searchInput.value = ''
  }, true)

  // ------------------------------------------------------------------
  // 2/ prepare the Search options for fuzzaldrin
  const fuzzaldrinPlusSearch = function (query, cb) {
    const results = fuzzaldrinPlus.filter(list, query, {key: 'path', maxResults: 10})
    for (let res of results) {
      res.html = basiqueBolderify(query, res.path)
    }
    cb(results)
  }

  const basiqueBolderify = function (query, path) {
    var words = query.split(' ')
    words = words.filter(function (item) { return (item !== '') })
    var startIndex = 0
    var nextWordOccurence
    var html = ''
    const lastIndex = path.length
    const pathLC = path.toLowerCase()
    while (startIndex < lastIndex) {
      nextWordOccurence = nextWord(path, pathLC, words, startIndex)
      if (!nextWordOccurence) {
        break
      }
      html += `${path.slice(startIndex, nextWordOccurence.start)}<b>${nextWordOccurence.word}</b>`
      startIndex = nextWordOccurence.start + nextWordOccurence.word.length
    }
    html += path.slice(startIndex)
    return html
  }

  const nextWord = function (path, pathLC, words, startIndex) {
    var wordFound = ''
    var i
    var lowestIndexFound = 10000000

    for (let w of words) {
      i = pathLC.indexOf(w.toLowerCase(), startIndex)
      if (i < lowestIndexFound && i > -1) {
        lowestIndexFound = i
        wordFound = w
      }
    }
    if (lowestIndexFound === -1) {
      return undefined
    } else {
      return {word: path.slice(lowestIndexFound, lowestIndexFound + wordFound.length), start: lowestIndexFound}
    }
  }

  // ------------------------------------------------------------------
  // 3/ initialisation of the autocomplete component
  autocompleteAlgolia('#search-bar-input', { hint: true }, [
    {
      source: fuzzaldrinPlusSearch,
      displayKey: 'path',
      templates: {
        suggestion: function (suggestion) {
          return suggestion.html
        }
      }
    }
  ]).on('autocomplete:selected', function (event, suggestion, dataset) {
    console.log(suggestion)
    var path
    if (suggestion.type === 'file'){
      path = suggestion.dirPath
    }else{
      path = suggestion.path
    }
    cozyClient.files.statByPath(path)
    .then(data => {
      window.location.href = '#/files/' + data._id
      searchInput.value = ''
    }).catch(err => {
      searchInput.value = ''
      console.log(err)
    })
  })

// ------------------------------------------------------------------
// 4/ data

var fileDB
const list = []

const root = document.querySelector('[role=application]')
const data = root.dataset
console.log('__DEVELOPMENT__',__DEVELOPMENT__);
const initialData = {
  cozyDomain:data.cozyDomain,
  cozyToken:data.cozyToken
}
cozyClient.init({
 cozyURL: (__DEVELOPMENT__ ? 'http://' : 'https://' ) + data.cozyDomain,
 token: data.cozyToken
})

const replicationOptions = {
  onError: () => {console.log('error lors de la création dela base')},
  onComplete: () => {
    console.log('onComplete')
    const dirDictionnary = {}
    const fileList = []
    fileDB = cozyClient.offline.getDatabase('io.cozy.files')
    fileDB.allDocs( {include_docs: true, descending: true}, function(err, docs) {
      // console.log('__ print DB : ' + someTxt + ' __');
      console.log(err, docs.rows);
      for (let doc of docs.rows) {
        console.log(doc)
        if (doc.doc.type === 'file') {
          const file = {
            type:'file',
            path:doc.doc.name,
            dir_id:doc.doc.dir_id
          }
          fileList.push(file)
          list.push(file)
        }else{
          list.push({
            type:'folder',
            path:doc.doc.path
          })
          dirDictionnary[doc.id] = doc.doc.path
        }
      }
      for (let file of fileList) {
        file.dirPath = dirDictionnary[file.dir_id]
        file.path = file.dirPath + '/' + file.path
      }
    })
    // cozyClient.init({
    //  cozyURL: initialData.cozyDomain,
    //  token: initialData.cozyToken
    // })
  }
}
cozyClient.offline.replicateFromCozy('io.cozy.files', replicationOptions )
// cozyClient.offline.startRepeatedReplication('io.cozy.files', 15, replicationOptions)
// lancement d'une replication
// cozyClient.offline.replicateFromCozy(, replicationOptions).then( ()=>{
//   fileDB = cozyClient.offline.getDatabase('io.cozy.files')
//   window.fileDB = fileDB
//   printDB('db at .then')
  // var todo = {
  //   date: new Date().toISOString(),
  //   title: 'some text',
  //   completed: false
  // };
  // fileDB.post(todo, function callback(err, result) {
  //   if (!err) {
  //     console.log('Successfully posted a todo!', result);
  //     printDB('db after creation of a todo')
  //   }
  // })
// })

// réplication toutes les 15s
// cozyClient.offline.startRepeatedReplication('io.cozy.files', 15, replicationOptions)

const printDB = (someTxt) => {
  fileDB.allDocs( {include_docs: true, descending: true}, function(err, doc) {
    console.log('__ print DB : ' + someTxt + ' __');
    console.log(err, doc.rows);
  })
}


// const list = [
//   {'type': 'folder', 'path': '/Administratif/Finance/Banques'},
//   {'type': 'folder', 'path': '/Administratif/Finance/Bulletins de salaires/Française des Jeux'},
//   {'type': 'folder', 'path': '/Administratif/Finance/Bulletins de salaires/RATP'},
//   {'type': 'folder', 'path': '/Administratif/Finance/Bulletins de salaires'},
//   {'type': 'folder', 'path': '/Administratif/Finance/Compta perso'},
//   {'type': 'folder', 'path': '/Administratif/Finance/Impôts/2014'},
//   {'type': 'folder', 'path': '/Administratif/Finance/Impôts/2015'},
//   {'type': 'folder', 'path': '/Administratif/Finance/Impôts/2016/Déclaration revenus'},
//   {'type': 'folder', 'path': '/Administratif/Finance/Impôts/2016'},
//   {'type': 'folder', 'path': '/Administratif/Finance/Impôts/2017'},
//   {'type': 'folder', 'path': '/Administratif/Finance/Impôts'},
//   {'type': 'folder', 'path': '/Administratif/Finance'},
//   {'type': 'folder', 'path': '/Administratif/Mutuelles & Assurances/CPAM/Relevés de remboursements'},
//   {'type': 'folder', 'path': '/Administratif/Mutuelles & Assurances/CPAM'},
//   {'type': 'folder', 'path': '/Administratif/Mutuelles & Assurances/Harmonie Mutuelle/Contrats & Cotisatons'},
//   {'type': 'folder', 'path': '/Administratif/Mutuelles & Assurances/Harmonie Mutuelle/Relevés de remboursements'},
//   {'type': 'folder', 'path': '/Administratif/Mutuelles & Assurances/Harmonie Mutuelle'},
//   {'type': 'folder', 'path': '/Administratif/Mutuelles & Assurances/MAIF/Contrats & Cotisatons'},
//   {'type': 'folder', 'path': '/Administratif/Mutuelles & Assurances/MAIF/Relevés de remboursements'},
//   {'type': 'folder', 'path': '/Administratif/Mutuelles & Assurances/MAIF'},
//   {'type': 'folder', 'path': '/Administratif/Mutuelles & Assurances'},
//   {'type': 'folder', 'path': '/Administratif/Opérateurs & Commerçants/Bouygues Telecom'},
//   {'type': 'folder', 'path': '/Administratif/Opérateurs & Commerçants/EDF'},
//   {'type': 'folder', 'path': '/Administratif/Opérateurs & Commerçants/Free mobile'},
//   {'type': 'folder', 'path': '/Administratif/Opérateurs & Commerçants/Orange box'},
//   {'type': 'folder', 'path': '/Administratif/Opérateurs & Commerçants'},
//   {'type': 'folder', 'path': '/Administratif/Partagé par/Genevieve/Bouygues Telecom'},
//   {'type': 'folder', 'path': '/Administratif/Partagé par/Genevieve/MAIF'},
//   {'type': 'folder', 'path': '/Administratif/Partagé par/Genevieve'},
//   {'type': 'folder', 'path': '/Administratif/Partagé par'},
//   {'type': 'folder', 'path': "/Administratif/Pièces d'identités"},
//   {'type': 'folder', 'path': '/Administratif'},
//   {'type': 'folder', 'path': '/Ecoles & Formations/Louise'},
//   {'type': 'folder', 'path': '/Ecoles & Formations/Moi'},
//   {'type': 'folder', 'path': '/Ecoles & Formations'},
//   {'type': 'folder', 'path': '/Photos/Partagées avec moi/partagé par Genevieve'},
//   {'type': 'folder', 'path': '/Photos/Partagées avec moi'},
//   {'type': 'folder', 'path': '/Photos/Provenant de mon mobile'},
//   {'type': 'folder', 'path': '/Photos'},
//   {'type': 'folder', 'path': '/Voyages & vacances'}]
  // const list = [
  //   {path:"/Administratif"},
  //   {path:"/Administratif/Bank statements"},
  //   {path:"/Administratif/Bank statements/Bank Of America"},
  //   {path:"/Administratif/Bank statements/Deutsche Bank"},
  //   {path:"/Administratif/Bank statements/Société Générale"},
  //   {path:"/Administratif/CPAM"},
  //   {path:"/Administratif/EDF"},
  //   {path:"/Administratif/EDF/Contrat"},
  //   {path:"/Administratif/EDF/Factures"},
  //   {path:"/Administratif/Emploi"},
  //   {path:"/Administratif/Impôts"},
  //   {path:"/Administratif/Logement"},
  //   {path:"/Administratif/Logement/Loyer 158 rue de Verdun"},
  //   {path:"/Administratif/Orange"},
  //   {path:"/Administratif/Pièces identité"},
  //   {path:"/Administratif/Pièces identité/Carte identité"},
  //   {path:"/Administratif/Pièces identité/Passeport"},
  //   {path:"/Administratif/Pièces identité/Permis de conduire"},
  //   {path:"/Appareils photo"},
  //   {path:"/Boulot"},
  //   {path:"/Cours ISEN"},
  //   {path:"/Cours ISEN/CIR"},
  //   {path:"/Cours ISEN/CIR/LINUX"},
  //   {path:"/Cours ISEN/CIR/MICROCONTROLEUR"},
  //   {path:"/Cours ISEN/CIR/RESEAUX"},
  //   {path:"/Cours ISEN/CIR/TRAITEMENT_SIGNAL"},
  //   {path:"/Divers photo"},
  //   {path:"/Divers photo/wallpapers"},
  //   {path:"/Films"},
  //   {path:"/Notes"},
  //   {path:"/Notes/Communication"},
  //   {path:"/Notes/Notes techniques"},
  //   {path:"/Notes/Recrutement"},
  //   {path:"/Projet appartement à Lyon"},
  //   {path:"/Vacances Périgord"}
  // ]
}

export default SearchBarCtrler
