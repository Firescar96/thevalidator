let enableHighlight = document.getElementById('enableHighlight');

enableHighlight.onclick = function(element) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.executeScript(
      tabs[0].id,
      {file: "highlighter.js"},
    );
  });
};

let submit = document.getElementById('submit');
submit.onclick = function(element) {

  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.executeScript(
      tabs[0].id,
      {file: "extracter.js"}
    );
  });
};

let getPrimaryEntities = (taggedPhrase) => {
  //find the root verb of the section
  let rootIndex;
  taggedPhrase.tokens.forEach( (token, i) => {
    if(token.dependencyEdge.label.localeCompare('ROOT')==0) {
      rootIndex = i;
    }
  })

  let graph = new Map();
  //convert the dependency edges into a DAG
  taggedPhrase.tokens.forEach((token, i) => {
    let parentIndex = token.dependencyEdge.headTokenIndex;
    if(parentIndex == i) return; // skip the head element which points to itself
    if(!graph.has(parentIndex)) graph.set(parentIndex, [])
    graph.get(parentIndex).push(i);
  })

  console.log(taggedPhrase.tokens);
  //scan the text for any words tagged as passive (making the phrase passive)
  let isPassive = taggedPhrase.tokens.some(word => {
    if(
      word.partOfSpeech.voice.localeCompare("PASSIVE") ==0 ||
      word.dependencyEdge.label.includes("PASS")
    ) return true;
    return false;
  })

  let subject = [];
  let verb = [];
  let directObject = [];

let getFullObject = (parentIndex) => {
  let fullObject = []
  if(!graph.get(parentIndex)) return fullObject;
  graph.get(parentIndex).forEach(elemPosition => {
    if(taggedPhrase.tokens[elemPosition].dependencyEdge.label.localeCompare('NN')==0)
      fullObject.push(taggedPhrase.tokens[elemPosition])
  })
  fullObject.push(taggedPhrase.tokens[parentIndex])
  return fullObject
}

if(isPassive) {
  //if it's passive then the subject comes after the direct object
  //both can be found using tags
  taggedPhrase.tokens.forEach( (token, i) => {
    let fullObject = getFullObject(i);
    if(token.dependencyEdge.label.localeCompare('NSUBJPASS')==0) {

      directObject.push(...fullObject);
    }
    if(token.dependencyEdge.label.localeCompare('POBJ')==0) {
      subject.push(...fullObject);
    }
    if(token.dependencyEdge.label.localeCompare('ROOT')==0) {
      verb.push(...fullObject);
    }
  })
} else {
  //if it's passive then the subject comes first
  //both can be found using tags
  taggedPhrase.tokens.forEach( (token, i) => {
    let fullObject = getFullObject(i);
    if(token.dependencyEdge.label.localeCompare('NSUBJ')==0) {
      subject.push(...fullObject);
    }
    if(token.dependencyEdge.label.localeCompare('DOBJ')==0) {
      directObject.push(...fullObject);
    }
    if(token.dependencyEdge.label.localeCompare('ROOT')==0) {
      verb.push(...fullObject);
    }
  })
}
  /*
  //Walk the dependency graph from the root and prune paths that don't end in a noun
  //objective is to find the subject and direct object
  let agenda = [[rootIndex]];
  let savedIndexes = new Set();
  while(agenda.length > 0) {
    curPath = agenda.pop()
    let leafIndex = curPath[curPath.length-1];
    //if this is a noun save it
    if(taggedPhrase.tokens[leafIndex].partOfSpeech.tag.localeCompare('NOUN') == 0) {
      // curPath.forEach(index => {
      //   savedIndexes.add(index);
      // })
      savedIndexes.add(leafIndex);
    }

    //if there are no more children then continue
    if(!graph.has(leafIndex)) {
      continue
    }

    //decend and add the children to the agenda
    graph.get(leafIndex).forEach(nextChild => {
       //this check skips the root as it points to itself
      if(nextChild == leafIndex) return;
      let nextPath = Array.from(curPath);
      nextPath.push(nextChild);
      agenda.push(nextPath);
    })
  }
  */

  return {subject, verb, directObject};
}

chrome.runtime.onMessage.addListener(function(message) {
  if (message.action == "getExtractedText") {
    var headers = new Headers();
    headers.append('Content-Type', 'application/json')

    //message.text is an array of all the text snippets highlighted by the user
    let requestPromises = message.text.map(text => {
      let myRequest = new Request('http://127.0.0.1:3457/analyzeSyntax', {
        method: 'POST',
        headers: headers,
        mode: 'cors',
        cache: 'default',
        body: JSON.stringify({text}),
      });
      fetch(myRequest)
      .then(response => response.json())
      .then(response => {
        let primaryEntities = getPrimaryEntities(response[0])
        console.log(`primaryEntities`, primaryEntities);
        let {subject, verb, directObject} = primaryEntities;
        let newPhrase = subject.concat(verb).concat(directObject)
          .map(x => x.lemma)
          .join(" ")
        console.log(newPhrase);

        //seach for the returned terms on snopes
        //get the title in all a tags search-taggedPhrase-post article-link
        //use hashing to compare words between the user entry and the title
        //scrape the snopes page for a match

        //find the rating-wrapper then either claim-mfalse or claim-mtrue
      });
    })
  }
});
