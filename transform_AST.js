function generateParser(specification) {
  var search, replace, re;

  var replaceRE = function(data, search, replace) {
    var newString = data.replace(new RegExp(search, "gm"), replace);
    if(debug && newString === data) {
      console.log("NOTE: "+search+" -> "+replace+" did not modify the string.");
    }
    return newString;
  };

  // Strip line comments
  search = "//.*";
  replace = "";
  specification = replaceRE(specification, search, replace);

  // Strip block comments (see http://ostermiller.org/findcomment.html)
  search = "(?:/\\*(?:[^*]|(?:\\*+[^*/]))*\\*+/)|(?://.*)\\n";
  replace = "";
  specification = replaceRE(specification, search, replace);

  // Strip empty lines
  search = "\\n\\n+";
  replace = "\n";
  specification = replaceRE(specification, search, replace);

// ==============

  var process_instructions = function(struct, data) {
    // code goes here
  }

// ==============

  // used during parsing
  var collections = {};
  var collection_names = [];

  // Convert non-empty collections into object generator functions
  var read_ast_collection = function(_, spacing, name, body /*, __match, __position, __full_text*/) {
    // We want to track "internal" collections in the collection
    // that defined them, but we only have a global list!
    // No worries, we can track changes across iterations:
    var before = [], i=0, last=collection_names.length;
    for(i=0; i<last; i++) { before[i] = collection_names[i]; }

    // Deal with any internal collections
    match = "^([ \\t]*)Collection\\s+(\\S+)\\s+{([\\w\\W]+?)^\\1}";
    body.replace(new RegExp(match,'gm'),read_ast_collection);

    // Track the new additions to the collections object
    var after = [], cname;
    for(i=0, last=collection_names.length; i<last; i++) {
      cname = collection_names[i];
      if(before.indexOf(cname) === -1) {
        after.push(cname); }}

    // And then perform a relocation of all the internal
    // collections to inside this collection's structure.
    var private_collections = {}, pos;
    for(i=0, last=after.length; i<last; i++) {
      cname = after[i];
      private_collections[cname] = collections[cname];
      // remove from global collections
      delete(collections[name]);
      // remove from global collection names
      pos = collection_names.indexOf(cname);
      collection_names.splice(pos,1); }

    // Now then, let's build the function that builds
    // this collection's corresponding structure:
    collection_names.push(name);
    collections[name] = function(data, owner) {
      var struct = {
        __owner: owner,
        __collections: private_collections,
        __name: name,
        __instructions : body,
        __pointer: data.pointer,
        __block_length: 0,
        __symbol_table: {
          index: [],
          types: {},
          startMarks: {},
          endMarks: {},
          add: function(name, type, start, end) {
            this.index.push(name);
            this.types[name] = type;
            this.startMarks[name] = start;
            this.endMarks[name] = end;
          },
          get: function(name) {
            return { type: this.types[name],
                     start: this.startMarks[name],
                     end: this.endMarks[names] };
          }
        },
        add: function(name, value, type, start, end) {
          this[name] = value;
          this.__sysmbol_table.add(name,type,start,end);
        },
        toString: function() {
          var td = this.__symbol_table,
              idx = td.index,
              i = 0,
              last = idx.length,
              symbol,
              serialization = ["__name: " + this.__name,
                               "__owner: " + this.__owner,
                               "__pointer: " + this.__pointer,
                               "__block_length: " + this.__block_length];
          for(i=0; i<last; i++) {
            symbol = idx[i];
            serialization.push(symbol + ": "+td.types[symbol]+" ("+td.startMarks[symbol]+","+td.endMarks[symbol]+")");
          }
          return spacing + serialization.join(spacing + "\n") + "\n";
        }
      };
      process_instructions(struct, data);
      struct.__block_length = data.pointer - struct.__pointer;
      return struct;
    };

    // And because this is a replace operation,
    // we return a replacement string... it's empty >_>
    return "";
  };

  // Note the +? in this pattern, for non-greedy selection.
  // Also note the [\w\W], which matches newlines, unlike [.], which doesn't.
  match = "^([ \\t]*)Collection\\s+(\\S+)\\s+{([\\w\\W]+?)^\\1}";
  specification.replace(new RegExp(match,'gm'),read_ast_collection);

// ================= NODE =============

  for(collection in collections) {
    if(!Object.hasOwnProperty(collections,collection)) {
      console.log(collections[collection]({pointer: 0}, {}).toString());
    }
  }
}