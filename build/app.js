import {createHash} from "crypto";
import {parse as parse$1, resolve} from "url";
var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$";
var unsafeChars = /[<>\b\f\n\r\t\0\u2028\u2029]/g;
var reserved = /^(?:do|if|in|for|int|let|new|try|var|byte|case|char|else|enum|goto|long|this|void|with|await|break|catch|class|const|final|float|short|super|throw|while|yield|delete|double|export|import|native|return|switch|throws|typeof|boolean|default|extends|finally|package|private|abstract|continue|debugger|function|volatile|interface|protected|transient|implements|instanceof|synchronized)$/;
var escaped$1 = {
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\0": "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
var objectProtoOwnPropertyNames = Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
function devalue(value) {
  var counts = new Map();
  function walk(thing) {
    if (typeof thing === "function") {
      throw new Error("Cannot stringify a function");
    }
    if (counts.has(thing)) {
      counts.set(thing, counts.get(thing) + 1);
      return;
    }
    counts.set(thing, 1);
    if (!isPrimitive(thing)) {
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
        case "Date":
        case "RegExp":
          return;
        case "Array":
          thing.forEach(walk);
          break;
        case "Set":
        case "Map":
          Array.from(thing).forEach(walk);
          break;
        default:
          var proto = Object.getPrototypeOf(thing);
          if (proto !== Object.prototype && proto !== null && Object.getOwnPropertyNames(proto).sort().join("\0") !== objectProtoOwnPropertyNames) {
            throw new Error("Cannot stringify arbitrary non-POJOs");
          }
          if (Object.getOwnPropertySymbols(thing).length > 0) {
            throw new Error("Cannot stringify POJOs with symbolic keys");
          }
          Object.keys(thing).forEach(function(key) {
            return walk(thing[key]);
          });
      }
    }
  }
  walk(value);
  var names = new Map();
  Array.from(counts).filter(function(entry) {
    return entry[1] > 1;
  }).sort(function(a, b) {
    return b[1] - a[1];
  }).forEach(function(entry, i) {
    names.set(entry[0], getName(i));
  });
  function stringify(thing) {
    if (names.has(thing)) {
      return names.get(thing);
    }
    if (isPrimitive(thing)) {
      return stringifyPrimitive(thing);
    }
    var type = getType(thing);
    switch (type) {
      case "Number":
      case "String":
      case "Boolean":
        return "Object(" + stringify(thing.valueOf()) + ")";
      case "RegExp":
        return "new RegExp(" + stringifyString(thing.source) + ', "' + thing.flags + '")';
      case "Date":
        return "new Date(" + thing.getTime() + ")";
      case "Array":
        var members = thing.map(function(v, i) {
          return i in thing ? stringify(v) : "";
        });
        var tail = thing.length === 0 || thing.length - 1 in thing ? "" : ",";
        return "[" + members.join(",") + tail + "]";
      case "Set":
      case "Map":
        return "new " + type + "([" + Array.from(thing).map(stringify).join(",") + "])";
      default:
        var obj = "{" + Object.keys(thing).map(function(key) {
          return safeKey(key) + ":" + stringify(thing[key]);
        }).join(",") + "}";
        var proto = Object.getPrototypeOf(thing);
        if (proto === null) {
          return Object.keys(thing).length > 0 ? "Object.assign(Object.create(null)," + obj + ")" : "Object.create(null)";
        }
        return obj;
    }
  }
  var str = stringify(value);
  if (names.size) {
    var params_1 = [];
    var statements_1 = [];
    var values_1 = [];
    names.forEach(function(name, thing) {
      params_1.push(name);
      if (isPrimitive(thing)) {
        values_1.push(stringifyPrimitive(thing));
        return;
      }
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
          values_1.push("Object(" + stringify(thing.valueOf()) + ")");
          break;
        case "RegExp":
          values_1.push(thing.toString());
          break;
        case "Date":
          values_1.push("new Date(" + thing.getTime() + ")");
          break;
        case "Array":
          values_1.push("Array(" + thing.length + ")");
          thing.forEach(function(v, i) {
            statements_1.push(name + "[" + i + "]=" + stringify(v));
          });
          break;
        case "Set":
          values_1.push("new Set");
          statements_1.push(name + "." + Array.from(thing).map(function(v) {
            return "add(" + stringify(v) + ")";
          }).join("."));
          break;
        case "Map":
          values_1.push("new Map");
          statements_1.push(name + "." + Array.from(thing).map(function(_a) {
            var k = _a[0], v = _a[1];
            return "set(" + stringify(k) + ", " + stringify(v) + ")";
          }).join("."));
          break;
        default:
          values_1.push(Object.getPrototypeOf(thing) === null ? "Object.create(null)" : "{}");
          Object.keys(thing).forEach(function(key) {
            statements_1.push("" + name + safeProp(key) + "=" + stringify(thing[key]));
          });
      }
    });
    statements_1.push("return " + str);
    return "(function(" + params_1.join(",") + "){" + statements_1.join(";") + "}(" + values_1.join(",") + "))";
  } else {
    return str;
  }
}
function getName(num) {
  var name = "";
  do {
    name = chars[num % chars.length] + name;
    num = ~~(num / chars.length) - 1;
  } while (num >= 0);
  return reserved.test(name) ? name + "_" : name;
}
function isPrimitive(thing) {
  return Object(thing) !== thing;
}
function stringifyPrimitive(thing) {
  if (typeof thing === "string")
    return stringifyString(thing);
  if (thing === void 0)
    return "void 0";
  if (thing === 0 && 1 / thing < 0)
    return "-0";
  var str = String(thing);
  if (typeof thing === "number")
    return str.replace(/^(-)?0\./, "$1.");
  return str;
}
function getType(thing) {
  return Object.prototype.toString.call(thing).slice(8, -1);
}
function escapeUnsafeChar(c) {
  return escaped$1[c] || c;
}
function escapeUnsafeChars(str) {
  return str.replace(unsafeChars, escapeUnsafeChar);
}
function safeKey(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? key : escapeUnsafeChars(JSON.stringify(key));
}
function safeProp(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? "." + key : "[" + escapeUnsafeChars(JSON.stringify(key)) + "]";
}
function stringifyString(str) {
  var result = '"';
  for (var i = 0; i < str.length; i += 1) {
    var char = str.charAt(i);
    var code = char.charCodeAt(0);
    if (char === '"') {
      result += '\\"';
    } else if (char in escaped$1) {
      result += escaped$1[char];
    } else if (code >= 55296 && code <= 57343) {
      var next = str.charCodeAt(i + 1);
      if (code <= 56319 && (next >= 56320 && next <= 57343)) {
        result += char + str[++i];
      } else {
        result += "\\u" + code.toString(16).toUpperCase();
      }
    } else {
      result += char;
    }
  }
  result += '"';
  return result;
}
function noop$1() {
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || (a && typeof a === "object" || typeof a === "function");
}
const subscriber_queue = [];
function writable(value, start = noop$1) {
  let stop;
  const subscribers = [];
  function set(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (let i = 0; i < subscribers.length; i += 1) {
          const s2 = subscribers[i];
          s2[1]();
          subscriber_queue.push(s2, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update(fn) {
    set(fn(value));
  }
  function subscribe2(run2, invalidate = noop$1) {
    const subscriber = [run2, invalidate];
    subscribers.push(subscriber);
    if (subscribers.length === 1) {
      stop = start(set) || noop$1;
    }
    run2(value);
    return () => {
      const index2 = subscribers.indexOf(subscriber);
      if (index2 !== -1) {
        subscribers.splice(index2, 1);
      }
      if (subscribers.length === 0) {
        stop();
        stop = null;
      }
    };
  }
  return {set, update, subscribe: subscribe2};
}
const s$1 = JSON.stringify;
async function render_response({
  options: options2,
  $session,
  page_config,
  status,
  error: error2,
  branch,
  page: page2
}) {
  const css2 = new Set(options2.entry.css);
  const js = new Set(options2.entry.js);
  const styles = new Set();
  const serialized_data = [];
  let rendered;
  let is_private = false;
  let maxage;
  if (error2) {
    error2.stack = options2.get_stack(error2);
  }
  if (branch) {
    branch.forEach(({node, loaded, fetched, uses_credentials}) => {
      if (node.css)
        node.css.forEach((url) => css2.add(url));
      if (node.js)
        node.js.forEach((url) => js.add(url));
      if (node.styles)
        node.styles.forEach((content) => styles.add(content));
      if (fetched && page_config.hydrate)
        serialized_data.push(...fetched);
      if (uses_credentials)
        is_private = true;
      maxage = loaded.maxage;
    });
    const session = writable($session);
    const props = {
      stores: {
        page: writable(null),
        navigating: writable(null),
        session
      },
      page: page2,
      components: branch.map(({node}) => node.module.default)
    };
    for (let i = 0; i < branch.length; i += 1) {
      props[`props_${i}`] = await branch[i].loaded.props;
    }
    let session_tracking_active = false;
    const unsubscribe = session.subscribe(() => {
      if (session_tracking_active)
        is_private = true;
    });
    session_tracking_active = true;
    try {
      rendered = options2.root.render(props);
    } finally {
      unsubscribe();
    }
  } else {
    rendered = {head: "", html: "", css: ""};
  }
  const links = options2.amp ? styles.size > 0 ? `<style amp-custom>${Array.from(styles).join("\n")}</style>` : "" : [
    ...Array.from(js).map((dep) => `<link rel="modulepreload" href="${dep}">`),
    ...Array.from(css2).map((dep) => `<link rel="stylesheet" href="${dep}">`)
  ].join("\n		");
  let init2 = "";
  if (options2.amp) {
    init2 = `
		<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
		<noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
		<script async src="https://cdn.ampproject.org/v0.js"></script>`;
  } else if (page_config.router || page_config.hydrate) {
    init2 = `<script type="module">
			import { start } from ${s$1(options2.entry.file)};
			start({
				target: ${options2.target ? `document.querySelector(${s$1(options2.target)})` : "document.body"},
				paths: ${s$1(options2.paths)},
				session: ${try_serialize($session, (error3) => {
      throw new Error(`Failed to serialize session data: ${error3.message}`);
    })},
				host: ${page2.host ? s$1(page2.host) : "location.host"},
				route: ${!!page_config.router},
				spa: ${!page_config.ssr},
				hydrate: ${page_config.ssr && page_config.hydrate ? `{
					status: ${status},
					error: ${serialize_error(error2)},
					nodes: [
						${branch.map(({node}) => `import(${s$1(node.entry)})`).join(",\n						")}
					],
					page: {
						host: ${page2.host ? s$1(page2.host) : "location.host"}, // TODO this is redundant
						path: ${s$1(page2.path)},
						query: new URLSearchParams(${s$1(page2.query.toString())}),
						params: ${s$1(page2.params)}
					}
				}` : "null"}
			});
		</script>`;
  }
  const head = [
    rendered.head,
    styles.size && !options2.amp ? `<style data-svelte>${Array.from(styles).join("\n")}</style>` : "",
    links,
    init2
  ].join("\n\n		");
  const body = options2.amp ? rendered.html : `${rendered.html}

			${serialized_data.map(({url, json}) => `<script type="svelte-data" url="${url}">${json}</script>`).join("\n\n			")}
		`.replace(/^\t{2}/gm, "");
  const headers = {
    "content-type": "text/html"
  };
  if (maxage) {
    headers["cache-control"] = `${is_private ? "private" : "public"}, max-age=${maxage}`;
  }
  return {
    status,
    headers,
    body: options2.template({head, body})
  };
}
function try_serialize(data, fail) {
  try {
    return devalue(data);
  } catch (err) {
    if (fail)
      fail(err);
    return null;
  }
}
function serialize_error(error2) {
  if (!error2)
    return null;
  let serialized = try_serialize(error2);
  if (!serialized) {
    const {name, message, stack} = error2;
    serialized = try_serialize({name, message, stack});
  }
  if (!serialized) {
    serialized = "{}";
  }
  return serialized;
}
function normalize(loaded) {
  if (loaded.error) {
    const error2 = typeof loaded.error === "string" ? new Error(loaded.error) : loaded.error;
    const status = loaded.status;
    if (!(error2 instanceof Error)) {
      return {
        status: 500,
        error: new Error(`"error" property returned from load() must be a string or instance of Error, received type "${typeof error2}"`)
      };
    }
    if (!status || status < 400 || status > 599) {
      console.warn('"error" returned from load() without a valid status code \u2014 defaulting to 500');
      return {status: 500, error: error2};
    }
    return {status, error: error2};
  }
  if (loaded.redirect) {
    if (!loaded.status || Math.floor(loaded.status / 100) !== 3) {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be accompanied by a 3xx status code')
      };
    }
    if (typeof loaded.redirect !== "string") {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be a string')
      };
    }
  }
  return loaded;
}
const s = JSON.stringify;
async function load_node({
  request,
  options: options2,
  state,
  route,
  page: page2,
  node,
  $session,
  context,
  is_leaf,
  is_error,
  status,
  error: error2
}) {
  const {module} = node;
  let uses_credentials = false;
  const fetched = [];
  let loaded;
  if (module.load) {
    const load_input = {
      page: page2,
      get session() {
        uses_credentials = true;
        return $session;
      },
      fetch: async (resource, opts = {}) => {
        let url;
        if (typeof resource === "string") {
          url = resource;
        } else {
          url = resource.url;
          opts = {
            method: resource.method,
            headers: resource.headers,
            body: resource.body,
            mode: resource.mode,
            credentials: resource.credentials,
            cache: resource.cache,
            redirect: resource.redirect,
            referrer: resource.referrer,
            integrity: resource.integrity,
            ...opts
          };
        }
        if (options2.read && url.startsWith(options2.paths.assets)) {
          url = url.replace(options2.paths.assets, "");
        }
        const parsed = parse$1(url);
        let response;
        if (parsed.protocol) {
          response = await fetch(parsed.href, opts);
        } else {
          const resolved = resolve(request.path, parsed.pathname);
          const filename = resolved.slice(1);
          const filename_html = `${filename}/index.html`;
          const asset = options2.manifest.assets.find((d2) => d2.file === filename || d2.file === filename_html);
          if (asset) {
            if (options2.read) {
              response = new Response(options2.read(asset.file), {
                headers: {
                  "content-type": asset.type
                }
              });
            } else {
              response = await fetch(`http://${page2.host}/${asset.file}`, opts);
            }
          }
          if (!response) {
            const headers = {...opts.headers};
            if (opts.credentials !== "omit") {
              uses_credentials = true;
              headers.cookie = request.headers.cookie;
              if (!headers.authorization) {
                headers.authorization = request.headers.authorization;
              }
            }
            const rendered = await ssr({
              host: request.host,
              method: opts.method || "GET",
              headers,
              path: resolved,
              body: opts.body,
              query: new URLSearchParams(parsed.query || "")
            }, options2, {
              fetched: url,
              initiator: route
            });
            if (rendered) {
              if (state.prerender) {
                state.prerender.dependencies.set(resolved, rendered);
              }
              response = new Response(rendered.body, {
                status: rendered.status,
                headers: rendered.headers
              });
            }
          }
        }
        if (response) {
          const proxy = new Proxy(response, {
            get(response2, key, receiver) {
              async function text() {
                const body = await response2.text();
                const headers = {};
                response2.headers.forEach((value, key2) => {
                  if (key2 !== "etag" && key2 !== "set-cookie")
                    headers[key2] = value;
                });
                fetched.push({
                  url,
                  json: `{"status":${response2.status},"statusText":${s(response2.statusText)},"headers":${s(headers)},"body":${escape$1(body)}}`
                });
                return body;
              }
              if (key === "text") {
                return text;
              }
              if (key === "json") {
                return async () => {
                  return JSON.parse(await text());
                };
              }
              return Reflect.get(response2, key, receiver);
            }
          });
          return proxy;
        }
        return response || new Response("Not found", {
          status: 404
        });
      },
      context: {...context}
    };
    if (is_error) {
      load_input.status = status;
      load_input.error = error2;
    }
    loaded = await module.load.call(null, load_input);
  } else {
    loaded = {};
  }
  if (!loaded && is_leaf && !is_error)
    return;
  return {
    node,
    loaded: normalize(loaded),
    context: loaded.context || context,
    fetched,
    uses_credentials
  };
}
const escaped$2 = {
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\0": "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
function escape$1(str) {
  let result = '"';
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charAt(i);
    const code = char.charCodeAt(0);
    if (char === '"') {
      result += '\\"';
    } else if (char in escaped$2) {
      result += escaped$2[char];
    } else if (code >= 55296 && code <= 57343) {
      const next = str.charCodeAt(i + 1);
      if (code <= 56319 && next >= 56320 && next <= 57343) {
        result += char + str[++i];
      } else {
        result += `\\u${code.toString(16).toUpperCase()}`;
      }
    } else {
      result += char;
    }
  }
  result += '"';
  return result;
}
async function respond_with_error({request, options: options2, state, $session, status, error: error2}) {
  const default_layout = await options2.load_component(options2.manifest.layout);
  const default_error = await options2.load_component(options2.manifest.error);
  const page2 = {
    host: request.host,
    path: request.path,
    query: request.query,
    params: {}
  };
  const loaded = await load_node({
    request,
    options: options2,
    state,
    route: null,
    page: page2,
    node: default_layout,
    $session,
    context: {},
    is_leaf: false,
    is_error: false
  });
  const branch = [
    loaded,
    await load_node({
      request,
      options: options2,
      state,
      route: null,
      page: page2,
      node: default_error,
      $session,
      context: loaded.context,
      is_leaf: false,
      is_error: true,
      status,
      error: error2
    })
  ];
  try {
    return await render_response({
      request,
      options: options2,
      $session,
      page_config: {
        hydrate: options2.hydrate,
        router: options2.router,
        ssr: options2.ssr
      },
      status,
      error: error2,
      branch,
      page: page2
    });
  } catch (error3) {
    options2.handle_error(error3);
    return {
      status: 500,
      headers: {},
      body: error3.stack
    };
  }
}
async function respond({request, options: options2, state, $session, route}) {
  const match = route.pattern.exec(request.path);
  const params = route.params(match);
  const page2 = {
    host: request.host,
    path: request.path,
    query: request.query,
    params
  };
  let nodes;
  try {
    nodes = await Promise.all(route.a.map((id) => id && options2.load_component(id)));
  } catch (error3) {
    options2.handle_error(error3);
    return await respond_with_error({
      request,
      options: options2,
      state,
      $session,
      status: 500,
      error: error3
    });
  }
  const leaf = nodes[nodes.length - 1].module;
  const page_config = {
    ssr: "ssr" in leaf ? leaf.ssr : options2.ssr,
    router: "router" in leaf ? leaf.router : options2.router,
    hydrate: "hydrate" in leaf ? leaf.hydrate : options2.hydrate
  };
  if (!leaf.prerender && state.prerender && !state.prerender.force) {
    return {
      status: 204,
      headers: {},
      body: null
    };
  }
  let branch;
  let status = 200;
  let error2;
  ssr:
    if (page_config.ssr) {
      let context = {};
      branch = [];
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        let loaded;
        if (node) {
          try {
            loaded = await load_node({
              request,
              options: options2,
              state,
              route,
              page: page2,
              node,
              $session,
              context,
              is_leaf: i === nodes.length - 1,
              is_error: false
            });
            if (!loaded)
              return;
            if (loaded.loaded.redirect) {
              return {
                status: loaded.loaded.status,
                headers: {
                  location: loaded.loaded.redirect
                }
              };
            }
            if (loaded.loaded.error) {
              ({status, error: error2} = loaded.loaded);
            }
          } catch (e) {
            options2.handle_error(e);
            status = 500;
            error2 = e;
          }
          if (error2) {
            while (i--) {
              if (route.b[i]) {
                const error_node = await options2.load_component(route.b[i]);
                let error_loaded;
                let node_loaded;
                let j = i;
                while (!(node_loaded = branch[j])) {
                  j -= 1;
                }
                try {
                  error_loaded = await load_node({
                    request,
                    options: options2,
                    state,
                    route,
                    page: page2,
                    node: error_node,
                    $session,
                    context: node_loaded.context,
                    is_leaf: false,
                    is_error: true,
                    status,
                    error: error2
                  });
                  if (error_loaded.loaded.error) {
                    continue;
                  }
                  branch = branch.slice(0, j + 1).concat(error_loaded);
                  break ssr;
                } catch (e) {
                  options2.handle_error(e);
                  continue;
                }
              }
            }
            return await respond_with_error({
              request,
              options: options2,
              state,
              $session,
              status,
              error: error2
            });
          }
        }
        branch.push(loaded);
        if (loaded && loaded.loaded.context) {
          context = {
            ...context,
            ...loaded.loaded.context
          };
        }
      }
    }
  try {
    return await render_response({
      request,
      options: options2,
      $session,
      page_config,
      status,
      error: error2,
      branch: branch && branch.filter(Boolean),
      page: page2
    });
  } catch (error3) {
    options2.handle_error(error3);
    return await respond_with_error({
      request,
      options: options2,
      state,
      $session,
      status: 500,
      error: error3
    });
  }
}
async function render_page(request, route, options2, state) {
  if (state.initiator === route) {
    return {
      status: 404,
      headers: {},
      body: `Not found: ${request.path}`
    };
  }
  const $session = await options2.hooks.getSession({context: request.context});
  if (route) {
    const response = await respond({
      request,
      options: options2,
      state,
      $session,
      route
    });
    if (response) {
      return response;
    }
    if (state.fetched) {
      return {
        status: 500,
        headers: {},
        body: `Bad request in load function: failed to fetch ${state.fetched}`
      };
    }
  } else {
    return await respond_with_error({
      request,
      options: options2,
      state,
      $session,
      status: 404,
      error: new Error(`Not found: ${request.path}`)
    });
  }
}
async function render_route(request, route) {
  const mod = await route.load();
  const handler = mod[request.method.toLowerCase().replace("delete", "del")];
  if (handler) {
    const match = route.pattern.exec(request.path);
    const params = route.params(match);
    const response = await handler({...request, params});
    if (response) {
      if (typeof response !== "object" || response.body == null) {
        return {
          status: 500,
          body: `Invalid response from route ${request.path}; ${response.body == null ? "body is missing" : `expected an object, got ${typeof response}`}`,
          headers: {}
        };
      }
      let {status = 200, body, headers = {}} = response;
      headers = lowercase_keys(headers);
      if (typeof body === "object" && !("content-type" in headers) || headers["content-type"] === "application/json") {
        headers = {...headers, "content-type": "application/json"};
        body = JSON.stringify(body);
      }
      return {status, body, headers};
    }
  }
}
function lowercase_keys(obj) {
  const clone = {};
  for (const key in obj) {
    clone[key.toLowerCase()] = obj[key];
  }
  return clone;
}
function md5(body) {
  return createHash("md5").update(body).digest("hex");
}
async function ssr(incoming, options2, state = {}) {
  if (incoming.path.endsWith("/") && incoming.path !== "/") {
    const q = incoming.query.toString();
    return {
      status: 301,
      headers: {
        location: incoming.path.slice(0, -1) + (q ? `?${q}` : "")
      }
    };
  }
  const context = await options2.hooks.getContext(incoming) || {};
  try {
    return await options2.hooks.handle({
      request: {
        ...incoming,
        params: null,
        context
      },
      render: async (request) => {
        for (const route of options2.manifest.routes) {
          if (!route.pattern.test(request.path))
            continue;
          const response = route.type === "endpoint" ? await render_route(request, route) : await render_page(request, route, options2, state);
          if (response) {
            if (response.status === 200) {
              if (!/(no-store|immutable)/.test(response.headers["cache-control"])) {
                const etag = `"${md5(response.body)}"`;
                if (request.headers["if-none-match"] === etag) {
                  return {
                    status: 304,
                    headers: {},
                    body: null
                  };
                }
                response.headers["etag"] = etag;
              }
            }
            return response;
          }
        }
        return await render_page(request, null, options2, state);
      }
    });
  } catch (e) {
    options2.handle_error(e);
    return {
      status: 500,
      headers: {},
      body: options2.dev ? e.stack : e.message
    };
  }
}
function noop() {
}
function run(fn) {
  return fn();
}
function blank_object() {
  return Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
function subscribe(store, ...callbacks) {
  if (store == null) {
    return noop;
  }
  const unsub = store.subscribe(...callbacks);
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
let current_component;
function set_current_component(component) {
  current_component = component;
}
function get_current_component() {
  if (!current_component)
    throw new Error("Function called outside component initialization");
  return current_component;
}
function onMount(fn) {
  get_current_component().$$.on_mount.push(fn);
}
function afterUpdate(fn) {
  get_current_component().$$.after_update.push(fn);
}
function setContext(key, context) {
  get_current_component().$$.context.set(key, context);
}
function getContext$1(key) {
  return get_current_component().$$.context.get(key);
}
const escaped = {
  '"': "&quot;",
  "'": "&#39;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;"
};
function escape(html) {
  return String(html).replace(/["'&<>]/g, (match) => escaped[match]);
}
function each(items, fn) {
  let str = "";
  for (let i = 0; i < items.length; i += 1) {
    str += fn(items[i], i);
  }
  return str;
}
const missing_component = {
  $$render: () => ""
};
function validate_component(component, name) {
  if (!component || !component.$$render) {
    if (name === "svelte:component")
      name += " this={...}";
    throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
  }
  return component;
}
let on_destroy;
function create_ssr_component(fn) {
  function $$render(result, props, bindings, slots, context) {
    const parent_component = current_component;
    const $$ = {
      on_destroy,
      context: new Map(parent_component ? parent_component.$$.context : context || []),
      on_mount: [],
      before_update: [],
      after_update: [],
      callbacks: blank_object()
    };
    set_current_component({$$});
    const html = fn(result, props, bindings, slots);
    set_current_component(parent_component);
    return html;
  }
  return {
    render: (props = {}, {$$slots = {}, context = new Map()} = {}) => {
      on_destroy = [];
      const result = {title: "", head: "", css: new Set()};
      const html = $$render(result, props, {}, $$slots, context);
      run_all(on_destroy);
      return {
        html,
        css: {
          code: Array.from(result.css).map((css2) => css2.code).join("\n"),
          map: null
        },
        head: result.title + result.head
      };
    },
    $$render
  };
}
function add_attribute(name, value, boolean) {
  if (value == null || boolean && !value)
    return "";
  return ` ${name}${value === true ? "" : `=${typeof value === "string" ? JSON.stringify(escape(value)) : `"${value}"`}`}`;
}
function add_classes(classes) {
  return classes ? ` class="${classes}"` : "";
}
var root_svelte_svelte_type_style_lang = "#svelte-announcer.svelte-1pdgbjn{clip:rect(0 0 0 0);-webkit-clip-path:inset(50%);clip-path:inset(50%);height:1px;left:0;overflow:hidden;position:absolute;top:0;white-space:nowrap;width:1px}";
const css$5 = {
  code: "#svelte-announcer.svelte-1pdgbjn{clip:rect(0 0 0 0);-webkit-clip-path:inset(50%);clip-path:inset(50%);height:1px;left:0;overflow:hidden;position:absolute;top:0;white-space:nowrap;width:1px}",
  map: `{"version":3,"file":"root.svelte","sources":["root.svelte"],"sourcesContent":["<!-- This file is generated by @sveltejs/kit \u2014 do not edit it! -->\\n<script>\\n\\timport { setContext, afterUpdate, onMount } from 'svelte';\\n\\n\\t// stores\\n\\texport let stores;\\n\\texport let page;\\n\\n\\texport let components;\\n\\texport let props_0 = null;\\n\\texport let props_1 = null;\\n\\texport let props_2 = null;\\n\\n\\tsetContext('__svelte__', stores);\\n\\n\\t$: stores.page.set(page);\\n\\tafterUpdate(stores.page.notify);\\n\\n\\tlet mounted = false;\\n\\tlet navigated = false;\\n\\tlet title = null;\\n\\n\\tonMount(() => {\\n\\t\\tconst unsubscribe = stores.page.subscribe(() => {\\n\\t\\t\\tif (mounted) {\\n\\t\\t\\t\\tnavigated = true;\\n\\t\\t\\t\\ttitle = document.title || 'untitled page';\\n\\t\\t\\t}\\n\\t\\t});\\n\\n\\t\\tmounted = true;\\n\\t\\treturn unsubscribe;\\n\\t});\\n</script>\\n\\n<svelte:component this={components[0]} {...(props_0 || {})}>\\n\\t{#if components[1]}\\n\\t\\t<svelte:component this={components[1]} {...(props_1 || {})}>\\n\\t\\t\\t{#if components[2]}\\n\\t\\t\\t\\t<svelte:component this={components[2]} {...(props_2 || {})}/>\\n\\t\\t\\t{/if}\\n\\t\\t</svelte:component>\\n\\t{/if}\\n</svelte:component>\\n\\n{#if mounted}\\n\\t<div id=\\"svelte-announcer\\" aria-live=\\"assertive\\" aria-atomic=\\"true\\">\\n\\t\\t{#if navigated}\\n\\t\\t\\tNavigated to {title}\\n\\t\\t{/if}\\n\\t</div>\\n{/if}\\n\\n<style>#svelte-announcer{clip:rect(0 0 0 0);-webkit-clip-path:inset(50%);clip-path:inset(50%);height:1px;left:0;overflow:hidden;position:absolute;top:0;white-space:nowrap;width:1px}</style>"],"names":[],"mappings":"AAqDO,gCAAiB,CAAC,KAAK,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,kBAAkB,MAAM,GAAG,CAAC,CAAC,UAAU,MAAM,GAAG,CAAC,CAAC,OAAO,GAAG,CAAC,KAAK,CAAC,CAAC,SAAS,MAAM,CAAC,SAAS,QAAQ,CAAC,IAAI,CAAC,CAAC,YAAY,MAAM,CAAC,MAAM,GAAG,CAAC"}`
};
const Root = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let {stores} = $$props;
  let {page: page2} = $$props;
  let {components} = $$props;
  let {props_0 = null} = $$props;
  let {props_1 = null} = $$props;
  let {props_2 = null} = $$props;
  setContext("__svelte__", stores);
  afterUpdate(stores.page.notify);
  let mounted = false;
  let navigated = false;
  let title = null;
  onMount(() => {
    const unsubscribe = stores.page.subscribe(() => {
      if (mounted) {
        navigated = true;
        title = document.title || "untitled page";
      }
    });
    mounted = true;
    return unsubscribe;
  });
  if ($$props.stores === void 0 && $$bindings.stores && stores !== void 0)
    $$bindings.stores(stores);
  if ($$props.page === void 0 && $$bindings.page && page2 !== void 0)
    $$bindings.page(page2);
  if ($$props.components === void 0 && $$bindings.components && components !== void 0)
    $$bindings.components(components);
  if ($$props.props_0 === void 0 && $$bindings.props_0 && props_0 !== void 0)
    $$bindings.props_0(props_0);
  if ($$props.props_1 === void 0 && $$bindings.props_1 && props_1 !== void 0)
    $$bindings.props_1(props_1);
  if ($$props.props_2 === void 0 && $$bindings.props_2 && props_2 !== void 0)
    $$bindings.props_2(props_2);
  $$result.css.add(css$5);
  {
    stores.page.set(page2);
  }
  return `


${validate_component(components[0] || missing_component, "svelte:component").$$render($$result, Object.assign(props_0 || {}), {}, {
    default: () => `${components[1] ? `${validate_component(components[1] || missing_component, "svelte:component").$$render($$result, Object.assign(props_1 || {}), {}, {
      default: () => `${components[2] ? `${validate_component(components[2] || missing_component, "svelte:component").$$render($$result, Object.assign(props_2 || {}), {}, {})}` : ``}`
    })}` : ``}`
  })}

${mounted ? `<div id="${"svelte-announcer"}" aria-live="${"assertive"}" aria-atomic="${"true"}" class="${"svelte-1pdgbjn"}">${navigated ? `Navigated to ${escape(title)}` : ``}</div>` : ``}`;
});
function set_paths(paths) {
}
function set_prerendering(value) {
}
/*!
 * cookie
 * Copyright(c) 2012-2014 Roman Shtylman
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */
var parse_1 = parse;
var serialize_1 = serialize;
var decode = decodeURIComponent;
var encode = encodeURIComponent;
var pairSplitRegExp = /; */;
var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
function parse(str, options2) {
  if (typeof str !== "string") {
    throw new TypeError("argument str must be a string");
  }
  var obj = {};
  var opt = options2 || {};
  var pairs = str.split(pairSplitRegExp);
  var dec = opt.decode || decode;
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i];
    var eq_idx = pair.indexOf("=");
    if (eq_idx < 0) {
      continue;
    }
    var key = pair.substr(0, eq_idx).trim();
    var val = pair.substr(++eq_idx, pair.length).trim();
    if (val[0] == '"') {
      val = val.slice(1, -1);
    }
    if (obj[key] == void 0) {
      obj[key] = tryDecode(val, dec);
    }
  }
  return obj;
}
function serialize(name, val, options2) {
  var opt = options2 || {};
  var enc = opt.encode || encode;
  if (typeof enc !== "function") {
    throw new TypeError("option encode is invalid");
  }
  if (!fieldContentRegExp.test(name)) {
    throw new TypeError("argument name is invalid");
  }
  var value = enc(val);
  if (value && !fieldContentRegExp.test(value)) {
    throw new TypeError("argument val is invalid");
  }
  var str = name + "=" + value;
  if (opt.maxAge != null) {
    var maxAge = opt.maxAge - 0;
    if (isNaN(maxAge) || !isFinite(maxAge)) {
      throw new TypeError("option maxAge is invalid");
    }
    str += "; Max-Age=" + Math.floor(maxAge);
  }
  if (opt.domain) {
    if (!fieldContentRegExp.test(opt.domain)) {
      throw new TypeError("option domain is invalid");
    }
    str += "; Domain=" + opt.domain;
  }
  if (opt.path) {
    if (!fieldContentRegExp.test(opt.path)) {
      throw new TypeError("option path is invalid");
    }
    str += "; Path=" + opt.path;
  }
  if (opt.expires) {
    if (typeof opt.expires.toUTCString !== "function") {
      throw new TypeError("option expires is invalid");
    }
    str += "; Expires=" + opt.expires.toUTCString();
  }
  if (opt.httpOnly) {
    str += "; HttpOnly";
  }
  if (opt.secure) {
    str += "; Secure";
  }
  if (opt.sameSite) {
    var sameSite = typeof opt.sameSite === "string" ? opt.sameSite.toLowerCase() : opt.sameSite;
    switch (sameSite) {
      case true:
        str += "; SameSite=Strict";
        break;
      case "lax":
        str += "; SameSite=Lax";
        break;
      case "strict":
        str += "; SameSite=Strict";
        break;
      case "none":
        str += "; SameSite=None";
        break;
      default:
        throw new TypeError("option sameSite is invalid");
    }
  }
  return str;
}
function tryDecode(str, decode2) {
  try {
    return decode2(str);
  } catch (e) {
    return str;
  }
}
var C__Users_Worakrit_Documents_project_node_modules_cookie = {
  parse: parse_1,
  serialize: serialize_1
};
var IDX = 256, HEX = [], BUFFER;
while (IDX--)
  HEX[IDX] = (IDX + 256).toString(16).substring(1);
function v4() {
  var i = 0, num, out = "";
  if (!BUFFER || IDX + 16 > 256) {
    BUFFER = Array(i = 256);
    while (i--)
      BUFFER[i] = 256 * Math.random() | 0;
    i = IDX = 0;
  }
  for (; i < 16; i++) {
    num = BUFFER[IDX + i];
    if (i == 6)
      out += HEX[num & 15 | 64];
    else if (i == 8)
      out += HEX[num & 63 | 128];
    else
      out += HEX[num];
    if (i & 1 && i > 1 && i < 11)
      out += "-";
  }
  IDX++;
  return out;
}
const getContext = (request) => {
  const cookies = C__Users_Worakrit_Documents_project_node_modules_cookie.parse(request.headers.cookie || "");
  return {
    is_new: !cookies.userid,
    userid: cookies.userid || v4()
  };
};
const handle = async ({request, render: render2}) => {
  const response = await render2({
    ...request,
    method: request.query.get("_method") || request.method
  });
  const {is_new, userid} = request.context;
  if (is_new) {
    return {
      ...response,
      headers: {
        ...response.headers,
        "set-cookie": `userid=${userid}; Path=/; HttpOnly`
      }
    };
  }
  return response;
};
var user_hooks = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  getContext,
  handle
});
const template = ({head, body}) => '<!DOCTYPE html>\n<html lang="en">\n	<head>\n		<meta charset="utf-8" />\n		<link rel="icon" href="/favicon.ico" />\n		<meta name="viewport" content="width=device-width, initial-scale=1" />\n		' + head + '\n	</head>\n	<body>\n		<div id="svelte">' + body + "</div>\n	</body>\n</html>\n";
let options = null;
function init(settings) {
  set_paths(settings.paths);
  set_prerendering(settings.prerendering || false);
  options = {
    amp: false,
    dev: false,
    entry: {
      file: "/./_app/start-7be64c4d.js",
      css: ["/./_app/assets/start-0826e215.css"],
      js: ["/./_app/start-7be64c4d.js", "/./_app/chunks/index-befac657.js"]
    },
    fetched: void 0,
    get_component_path: (id) => "/./_app/" + entry_lookup[id],
    get_stack: (error2) => String(error2),
    handle_error: (error2) => {
      console.error(error2.stack);
      error2.stack = options.get_stack(error2);
    },
    hooks: get_hooks(user_hooks),
    hydrate: true,
    initiator: void 0,
    load_component,
    manifest,
    paths: settings.paths,
    read: settings.read,
    root: Root,
    router: true,
    ssr: true,
    target: "#svelte",
    template
  };
}
const d = decodeURIComponent;
const empty = () => ({});
const manifest = {
  assets: [{file: "favicon.ico", size: 1150, type: "image/vnd.microsoft.icon"}, {file: "robots.txt", size: 67, type: "text/plain"}, {file: "svelte-welcome.png", size: 360807, type: "image/png"}, {file: "svelte-welcome.webp", size: 115470, type: "image/webp"}],
  layout: "src/routes/$layout.svelte",
  error: ".svelte/build/components/error.svelte",
  routes: [
    {
      type: "page",
      pattern: /^\/$/,
      params: empty,
      a: ["src/routes/$layout.svelte", "src/routes/index.svelte"],
      b: [".svelte/build/components/error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/search\/?$/,
      params: empty,
      a: ["src/routes/$layout.svelte", "src/routes/search/index.svelte"],
      b: [".svelte/build/components/error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/about\/?$/,
      params: empty,
      a: ["src/routes/$layout.svelte", "src/routes/about.svelte"],
      b: [".svelte/build/components/error.svelte"]
    },
    {
      type: "endpoint",
      pattern: /^\/todos\.json$/,
      params: empty,
      load: () => Promise.resolve().then(function() {
        return index_json;
      })
    },
    {
      type: "page",
      pattern: /^\/todos\/?$/,
      params: empty,
      a: ["src/routes/$layout.svelte", "src/routes/todos/index.svelte"],
      b: [".svelte/build/components/error.svelte"]
    },
    {
      type: "endpoint",
      pattern: /^\/todos\/([^/]+?)\.json$/,
      params: (m) => ({uid: d(m[1])}),
      load: () => Promise.resolve().then(function() {
        return _uid__json;
      })
    }
  ]
};
const get_hooks = (hooks) => ({
  getContext: hooks.getContext || (() => ({})),
  getSession: hooks.getSession || (() => ({})),
  handle: hooks.handle || (({request, render: render2}) => render2(request))
});
const module_lookup = {
  "src/routes/$layout.svelte": () => Promise.resolve().then(function() {
    return $layout$1;
  }),
  ".svelte/build/components/error.svelte": () => Promise.resolve().then(function() {
    return error;
  }),
  "src/routes/index.svelte": () => Promise.resolve().then(function() {
    return index$2;
  }),
  "src/routes/search/index.svelte": () => Promise.resolve().then(function() {
    return index$1;
  }),
  "src/routes/about.svelte": () => Promise.resolve().then(function() {
    return about;
  }),
  "src/routes/todos/index.svelte": () => Promise.resolve().then(function() {
    return index;
  })
};
const metadata_lookup = {"src/routes/$layout.svelte": {entry: "/./_app/pages/$layout.svelte-96f9f7ea.js", css: ["/./_app/assets/pages/$layout.svelte-ad0ec971.css"], js: ["/./_app/pages/$layout.svelte-96f9f7ea.js", "/./_app/chunks/index-befac657.js"], styles: null}, ".svelte/build/components/error.svelte": {entry: "/./_app/error.svelte-b0c7e3d2.js", css: [], js: ["/./_app/error.svelte-b0c7e3d2.js", "/./_app/chunks/index-befac657.js"], styles: null}, "src/routes/index.svelte": {entry: "/./_app/pages/index.svelte-982bc8d7.js", css: ["/./_app/assets/pages/index.svelte-5ba10101.css"], js: ["/./_app/pages/index.svelte-982bc8d7.js", "/./_app/chunks/index-befac657.js"], styles: null}, "src/routes/search/index.svelte": {entry: "/./_app/pages/search/index.svelte-35845282.js", css: [], js: ["/./_app/pages/search/index.svelte-35845282.js", "/./_app/chunks/index-befac657.js"], styles: null}, "src/routes/about.svelte": {entry: "/./_app/pages/about.svelte-216ce0a2.js", css: ["/./_app/assets/pages/about.svelte-51ba7a34.css"], js: ["/./_app/pages/about.svelte-216ce0a2.js", "/./_app/chunks/index-befac657.js"], styles: null}, "src/routes/todos/index.svelte": {entry: "/./_app/pages/todos/index.svelte-abe5d607.js", css: ["/./_app/assets/pages/todos/index.svelte-0cc21db3.css"], js: ["/./_app/pages/todos/index.svelte-abe5d607.js", "/./_app/chunks/index-befac657.js"], styles: null}};
async function load_component(file) {
  return {
    module: await module_lookup[file](),
    ...metadata_lookup[file]
  };
}
init({paths: {base: "", assets: "/."}});
function render(request, {
  prerender: prerender2
} = {}) {
  const host = request.headers["host"];
  return ssr({...request, host}, options, {prerender: prerender2});
}
const base = "https://api.svelte.dev";
async function api(request, resource, data) {
  if (!request.context.userid) {
    return {status: 401};
  }
  const res = await fetch(`${base}/${resource}`, {
    method: request.method,
    headers: {
      "content-type": "application/json"
    },
    body: data && JSON.stringify(data)
  });
  if (res.ok && request.method !== "GET" && request.headers.accept !== "application/json") {
    return {
      status: 303,
      headers: {
        location: "/todos"
      },
      body: ""
    };
  }
  return {
    status: res.status,
    body: await res.json()
  };
}
const get = async (request) => {
  if (!request.context.userid) {
    return {body: []};
  }
  const response = await api(request, `todos/${request.context.userid}`);
  if (response.status === 404) {
    return {body: []};
  }
  return response;
};
const post = async (request) => {
  const response = await api(request, `todos/${request.context.userid}`, {
    text: request.body.get("text")
  });
  return response;
};
var index_json = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  get,
  post
});
const patch = async (request) => {
  return api(request, `todos/${request.context.userid}/${request.params.uid}`, {
    text: request.body.get("text"),
    done: request.body.has("done") ? !!request.body.get("done") : void 0
  });
};
const del = async (request) => {
  return api(request, `todos/${request.context.userid}/${request.params.uid}`);
};
var _uid__json = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  patch,
  del
});
const getStores = () => {
  const stores = getContext$1("__svelte__");
  return {
    page: {
      subscribe: stores.page.subscribe
    },
    navigating: {
      subscribe: stores.navigating.subscribe
    },
    get preloading() {
      console.error("stores.preloading is deprecated; use stores.navigating instead");
      return {
        subscribe: stores.navigating.subscribe
      };
    },
    session: stores.session
  };
};
const page = {
  subscribe(fn) {
    const store = getStores().page;
    return store.subscribe(fn);
  }
};
var index_svelte_svelte_type_style_lang$3 = "nav.svelte-d8yqwh{display:flex;max-width:-webkit-max-content;max-width:-moz-max-content;max-width:max-content}";
const css$4 = {
  code: "nav.svelte-d8yqwh{display:flex;max-width:-webkit-max-content;max-width:-moz-max-content;max-width:max-content}",
  map: `{"version":3,"file":"index.svelte","sources":["index.svelte"],"sourcesContent":["<script lang=\\"ts\\">import { page } from '$app/stores';\\r\\nimport logo from './svelte-logo.svg';\\r\\n</script>\\n\\n<header>\\n\\t<nav>\\n\\t\\t<div class=\\"container flex\\">\\n\\t\\t\\t<ul>\\n\\t\\t\\t\\t<li class:active={$page.path === '/'}><a sveltekit:prefetch href=\\"/\\">Home</a></li>\\n\\t\\t\\t\\t<li class:active={$page.path === '/about'}>\\n\\t\\t\\t\\t\\t<a sveltekit:prefetch href=\\"/about\\">About</a>\\n\\t\\t\\t\\t</li>\\n\\t\\t\\t\\t<li class:active={$page.path === '/todos'}>\\n\\t\\t\\t\\t\\t<a sveltekit:prefetch href=\\"/todos\\">Todos</a>\\n\\t\\t\\t\\t</li>\\n\\t\\t\\t</ul>\\n\\t\\t</div>\\n\\t</nav>\\n</header>\\n\\n<style>nav{display:flex;max-width:-webkit-max-content;max-width:-moz-max-content;max-width:max-content}</style>\\n"],"names":[],"mappings":"AAoBO,iBAAG,CAAC,QAAQ,IAAI,CAAC,UAAU,mBAAmB,CAAC,UAAU,gBAAgB,CAAC,UAAU,WAAW,CAAC"}`
};
const Header = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  $$result.css.add(css$4);
  $$unsubscribe_page();
  return `<header><nav class="${"svelte-d8yqwh"}"><div class="${"container flex"}"><ul><li${add_classes([$page.path === "/" ? "active" : ""].join(" ").trim())}><a sveltekit:prefetch href="${"/"}">Home</a></li>
				<li${add_classes([$page.path === "/about" ? "active" : ""].join(" ").trim())}><a sveltekit:prefetch href="${"/about"}">About</a></li>
				<li${add_classes([$page.path === "/todos" ? "active" : ""].join(" ").trim())}><a sveltekit:prefetch href="${"/todos"}">Todos</a></li></ul></div></nav>
</header>`;
});
var app = ":root{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Cantarell,Open Sans,Helvetica Neue,sans-serif}@tailwind base;@tailwind components;@tailwind utilities;";
var $layout_svelte_svelte_type_style_lang = "main.svelte-1wxnjqg{box-sizing:border-box;flex:1;margin:0 auto;max-width:1024px;padding:1rem;width:100%}footer.svelte-1wxnjqg,main.svelte-1wxnjqg{display:flex;flex-direction:column}footer.svelte-1wxnjqg{align-items:center;justify-content:center;padding:40px}@media(min-width:480px){footer.svelte-1wxnjqg{padding:40px 0}}";
const css$3 = {
  code: "main.svelte-1wxnjqg{box-sizing:border-box;flex:1;margin:0 auto;max-width:1024px;padding:1rem;width:100%}footer.svelte-1wxnjqg,main.svelte-1wxnjqg{display:flex;flex-direction:column}footer.svelte-1wxnjqg{align-items:center;justify-content:center;padding:40px}@media(min-width:480px){footer.svelte-1wxnjqg{padding:40px 0}}",
  map: `{"version":3,"file":"$layout.svelte","sources":["$layout.svelte"],"sourcesContent":["<script lang=\\"ts\\">import Header from '$lib/Header/index.svelte';\\r\\nimport '../app.postcss';\\r\\n</script>\\n\\n<Header />\\n\\n<main>\\n\\t<slot />\\n</main>\\n\\n<footer />\\n\\n<style>main{box-sizing:border-box;flex:1;margin:0 auto;max-width:1024px;padding:1rem;width:100%}footer,main{display:flex;flex-direction:column}footer{align-items:center;justify-content:center;padding:40px}footer a{font-weight:700}@media (min-width:480px){footer{padding:40px 0}}</style>\\n"],"names":[],"mappings":"AAYO,mBAAI,CAAC,WAAW,UAAU,CAAC,KAAK,CAAC,CAAC,OAAO,CAAC,CAAC,IAAI,CAAC,UAAU,MAAM,CAAC,QAAQ,IAAI,CAAC,MAAM,IAAI,CAAC,qBAAM,CAAC,mBAAI,CAAC,QAAQ,IAAI,CAAC,eAAe,MAAM,CAAC,qBAAM,CAAC,YAAY,MAAM,CAAC,gBAAgB,MAAM,CAAC,QAAQ,IAAI,CAAC,AAAyB,MAAM,AAAC,WAAW,KAAK,CAAC,CAAC,qBAAM,CAAC,QAAQ,IAAI,CAAC,CAAC,CAAC,CAAC"}`
};
const $layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css$3);
  return `${validate_component(Header, "Header").$$render($$result, {}, {}, {})}

<main class="${"svelte-1wxnjqg"}">${slots.default ? slots.default({}) : ``}</main>

<footer class="${"svelte-1wxnjqg"}"></footer>`;
});
var $layout$1 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: $layout
});
function load$1({error: error2, status}) {
  return {props: {error: error2, status}};
}
const Error$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let {status} = $$props;
  let {error: error2} = $$props;
  if ($$props.status === void 0 && $$bindings.status && status !== void 0)
    $$bindings.status(status);
  if ($$props.error === void 0 && $$bindings.error && error2 !== void 0)
    $$bindings.error(error2);
  return `<h1>${escape(status)}</h1>

<p>${escape(error2.message)}</p>


${error2.stack ? `<pre>${escape(error2.stack)}</pre>` : ``}`;
});
var error = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: Error$1,
  load: load$1
});
var index_svelte_svelte_type_style_lang$2 = ".counter.svelte-1g1mb68.svelte-1g1mb68{border-bottom:1px solid rgba(0,0,0,.1);border-top:1px solid rgba(0,0,0,.1);display:flex;margin:1rem 0}.counter.svelte-1g1mb68 button.svelte-1g1mb68{align-items:center;background-color:transparent;border:0;color:var(--text-color);display:flex;font-size:2rem;justify-content:center;padding:0;width:2em}.counter.svelte-1g1mb68 button.svelte-1g1mb68:hover{background-color:var(--secondary-color)}svg.svelte-1g1mb68.svelte-1g1mb68{height:25%;width:25%}path.svelte-1g1mb68.svelte-1g1mb68{vector-effect:non-scaling-stroke;stroke-width:2px;stroke:var(--text-color)}.counter-viewport.svelte-1g1mb68.svelte-1g1mb68{height:4em;overflow:hidden;position:relative;text-align:center;width:8em}.counter-viewport.svelte-1g1mb68 strong.svelte-1g1mb68{align-items:center;color:var(--accent-color);display:block;display:flex;font-size:4rem;font-weight:400;justify-content:center}.counter-digits.svelte-1g1mb68.svelte-1g1mb68,.counter-viewport.svelte-1g1mb68 strong.svelte-1g1mb68{height:100%;position:absolute;width:100%}";
var index_svelte_svelte_type_style_lang$1 = "section.svelte-8cruuo{align-items:center;display:flex;flex:1;flex-direction:column;justify-content:center}";
const css$2 = {
  code: "section.svelte-8cruuo{align-items:center;display:flex;flex:1;flex-direction:column;justify-content:center}",
  map: `{"version":3,"file":"index.svelte","sources":["index.svelte"],"sourcesContent":["<script context=\\"module\\" lang=\\"ts\\">export const prerender = true;\\r\\n</script>\\n\\n<script lang=\\"ts\\">import Counter from '$lib/Counter/index.svelte';\\r\\n</script>\\n\\n<svelte:head>\\n\\t<title>Home</title>\\n</svelte:head>\\n\\n<section>Hello world</section>\\n\\n<style style lang=\\"postcss\\">section{align-items:center;display:flex;flex:1;flex-direction:column;justify-content:center}</style>\\n"],"names":[],"mappings":"AAY4B,qBAAO,CAAC,YAAY,MAAM,CAAC,QAAQ,IAAI,CAAC,KAAK,CAAC,CAAC,eAAe,MAAM,CAAC,gBAAgB,MAAM,CAAC"}`
};
const prerender$1 = true;
const Routes = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css$2);
  return `${$$result.head += `${$$result.title = `<title>Home</title>`, ""}`, ""}

<section class="${"svelte-8cruuo"}">Hello world</section>`;
});
var index$2 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: Routes,
  prerender: prerender$1
});
const Search = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<input type="${"search"}">`;
});
var index$1 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: Search
});
const browser = false;
const dev = false;
var about_svelte_svelte_type_style_lang = ".content.svelte-t58uux{margin:var(--column-margin-top) auto 0 auto;max-width:var(--column-width);width:100%}";
const css$1 = {
  code: ".content.svelte-t58uux{margin:var(--column-margin-top) auto 0 auto;max-width:var(--column-width);width:100%}",
  map: `{"version":3,"file":"about.svelte","sources":["about.svelte"],"sourcesContent":["<script context=\\"module\\">\\n\\timport { browser, dev } from '$app/env';\\n\\n\\t// we don't need any JS on this page, though we'll load\\n\\t// it in dev so that we get hot module replacement...\\n\\texport const hydrate = dev;\\n\\n\\t// ...but if the client-side router is already loaded\\n\\t// (i.e. we came here from elsewhere in the app), use it\\n\\texport const router = browser;\\n\\n\\t// since there's no dynamic data here, we can prerender\\n\\t// it so that it gets served as a static asset in prod\\n\\texport const prerender = true;\\n</script>\\n\\n<svelte:head>\\n\\t<title>About</title>\\n</svelte:head>\\n\\n<div class=\\"content\\">\\n\\t<h1>About this app</h1>\\n\\n\\t<p>This is a <a href=\\"https://kit.svelte.dev\\">SvelteKit</a> app. You can make your own by typing the following into your command line and following the prompts:</p>\\n\\n\\t<!-- TODO lose the @next! -->\\n\\t<pre>npx init svelte@next</pre>\\n\\n\\t<p>The page you're looking at is purely static HTML, with no client-side interactivity needed. Because of that, we don't need to load any JavaScript. Try viewing the page's source, or opening the devtools network panel and reloading.</p>\\n\\n\\t<p>The <a href=\\"/todos\\">TODOs</a> page illustrates SvelteKit's data loading and form handling. Try using it with JavaScript disabled!</p>\\n</div>\\n\\n<style>.content{margin:var(--column-margin-top) auto 0 auto;max-width:var(--column-width);width:100%}</style>"],"names":[],"mappings":"AAiCO,sBAAQ,CAAC,OAAO,IAAI,mBAAmB,CAAC,CAAC,IAAI,CAAC,CAAC,CAAC,IAAI,CAAC,UAAU,IAAI,cAAc,CAAC,CAAC,MAAM,IAAI,CAAC"}`
};
const hydrate = dev;
const router = browser;
const prerender = true;
const About = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css$1);
  return `${$$result.head += `${$$result.title = `<title>About</title>`, ""}`, ""}

<div class="${"content svelte-t58uux"}"><h1>About this app</h1>

	<p>This is a <a href="${"https://kit.svelte.dev"}">SvelteKit</a> app. You can make your own by typing the following into your command line and following the prompts:</p>

	
	<pre>npx init svelte@next</pre>

	<p>The page you&#39;re looking at is purely static HTML, with no client-side interactivity needed. Because of that, we don&#39;t need to load any JavaScript. Try viewing the page&#39;s source, or opening the devtools network panel and reloading.</p>

	<p>The <a href="${"/todos"}">TODOs</a> page illustrates SvelteKit&#39;s data loading and form handling. Try using it with JavaScript disabled!</p>
</div>`;
});
var about = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: About,
  hydrate,
  router,
  prerender
});
var index_svelte_svelte_type_style_lang = `.todos.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{line-height:1;margin:var(--column-margin-top) auto 0 auto;max-width:var(--column-width);width:100%}.new.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{margin:0 0 .5rem}input.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{border:1px solid transparent}input.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf:focus-visible{border:1px solid violet!important;box-shadow:inset 1px 1px 6px rgba(0,0,0,.1);outline:none}.new.svelte-13wdnuf input.svelte-13wdnuf.svelte-13wdnuf{background:hsla(0,0%,100%,.05);box-sizing:border-box;font-size:28px;padding:.5em 1em .3em;text-align:center;width:100%}.new.svelte-13wdnuf input.svelte-13wdnuf.svelte-13wdnuf,.todo.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{border-radius:8px}.todo.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{grid-gap:.5rem;align-items:center;background-color:#fff;display:grid;filter:drop-shadow(2px 4px 6px rgba(0,0,0,.1));grid-template-columns:2rem 1fr 2rem;margin:0 0 .5rem;padding:.5rem;transform:translate(-1px,-1px);transition:filter .2s,transform .2s}.done.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{filter:drop-shadow(0 0 1px rgba(0,0,0,.1));opacity:.4;transform:none}form.text.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{align-items:center;display:flex;flex:1;position:relative}.todo.svelte-13wdnuf input.svelte-13wdnuf.svelte-13wdnuf{border-radius:3px;flex:1;padding:.5em 2em .5em .8em}.todo.svelte-13wdnuf button.svelte-13wdnuf.svelte-13wdnuf{background-color:transparent;background-position:50% 50%;background-repeat:no-repeat;border:none;height:2em;width:2em}button.toggle.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{background-size:1em auto;border:1px solid rgba(0,0,0,.2);border-radius:50%;box-sizing:border-box}.done.svelte-13wdnuf .toggle.svelte-13wdnuf.svelte-13wdnuf{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg width='22' height='16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='m20.5 1.5-13.063 13L1.5 8.59' stroke='%23676778' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")}.delete.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg width='24' height='24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4.5 5v17h15V5h-15z' fill='%23676778' stroke='%23676778' stroke-width='1.5' stroke-linejoin='round'/%3E%3Cpath d='M10 10v6.5m4-6.5v6.5' stroke='%23fff' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M2 5h20' stroke='%23676778' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='m8 5 1.645-3h4.744L16 5H8z' fill='%23676778' stroke='%23676778' stroke-width='1.5' stroke-linejoin='round'/%3E%3C/svg%3E");opacity:.2}.delete.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf:hover{opacity:1;transition:opacity .2s}.save.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg width='24' height='24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2z' fill='%23676778' stroke='%23676778' stroke-width='1.5' stroke-linejoin='round'/%3E%3Cpath d='M17 2v9H7.5V2H17z' fill='%23fff' stroke='%23fff' stroke-width='1.5' stroke-linejoin='round'/%3E%3Cpath d='M13.5 5.5v2M5.998 2H18.5' stroke='%23676778' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");opacity:0;position:absolute;right:0}.todo.svelte-13wdnuf input.svelte-13wdnuf:focus+.save.svelte-13wdnuf{opacity:1;transition:opacity .2s}`;
const css = {
  code: `.todos.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{line-height:1;margin:var(--column-margin-top) auto 0 auto;max-width:var(--column-width);width:100%}.new.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{margin:0 0 .5rem}input.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{border:1px solid transparent}input.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf:focus-visible{border:1px solid violet!important;box-shadow:inset 1px 1px 6px rgba(0,0,0,.1);outline:none}.new.svelte-13wdnuf input.svelte-13wdnuf.svelte-13wdnuf{background:hsla(0,0%,100%,.05);box-sizing:border-box;font-size:28px;padding:.5em 1em .3em;text-align:center;width:100%}.new.svelte-13wdnuf input.svelte-13wdnuf.svelte-13wdnuf,.todo.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{border-radius:8px}.todo.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{grid-gap:.5rem;align-items:center;background-color:#fff;display:grid;filter:drop-shadow(2px 4px 6px rgba(0,0,0,.1));grid-template-columns:2rem 1fr 2rem;margin:0 0 .5rem;padding:.5rem;transform:translate(-1px,-1px);transition:filter .2s,transform .2s}.done.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{filter:drop-shadow(0 0 1px rgba(0,0,0,.1));opacity:.4;transform:none}form.text.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{align-items:center;display:flex;flex:1;position:relative}.todo.svelte-13wdnuf input.svelte-13wdnuf.svelte-13wdnuf{border-radius:3px;flex:1;padding:.5em 2em .5em .8em}.todo.svelte-13wdnuf button.svelte-13wdnuf.svelte-13wdnuf{background-color:transparent;background-position:50% 50%;background-repeat:no-repeat;border:none;height:2em;width:2em}button.toggle.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{background-size:1em auto;border:1px solid rgba(0,0,0,.2);border-radius:50%;box-sizing:border-box}.done.svelte-13wdnuf .toggle.svelte-13wdnuf.svelte-13wdnuf{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg width='22' height='16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='m20.5 1.5-13.063 13L1.5 8.59' stroke='%23676778' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")}.delete.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg width='24' height='24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4.5 5v17h15V5h-15z' fill='%23676778' stroke='%23676778' stroke-width='1.5' stroke-linejoin='round'/%3E%3Cpath d='M10 10v6.5M14 10v6.5' stroke='%23fff' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M2 5h20' stroke='%23676778' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='m8 5 1.645-3h4.744L16 5H8z' fill='%23676778' stroke='%23676778' stroke-width='1.5' stroke-linejoin='round'/%3E%3C/svg%3E");opacity:.2}.delete.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf:hover{opacity:1;transition:opacity .2s}.save.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg width='24' height='24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2z' fill='%23676778' stroke='%23676778' stroke-width='1.5' stroke-linejoin='round'/%3E%3Cpath d='M17 2v9H7.5V2H17z' fill='%23fff' stroke='%23fff' stroke-width='1.5' stroke-linejoin='round'/%3E%3Cpath d='M13.5 5.5v2M5.998 2H18.5' stroke='%23676778' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");opacity:0;position:absolute;right:0}.todo.svelte-13wdnuf input.svelte-13wdnuf:focus+.save.svelte-13wdnuf{opacity:1;transition:opacity .2s}`,
  map: `{"version":3,"file":"index.svelte","sources":["index.svelte"],"sourcesContent":["<script context=\\"module\\" lang=\\"ts\\">var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {\\r\\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\\r\\n    return new (P || (P = Promise))(function (resolve, reject) {\\r\\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\\r\\n        function rejected(value) { try { step(generator[\\"throw\\"](value)); } catch (e) { reject(e); } }\\r\\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\\r\\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\\r\\n    });\\r\\n};\\r\\nimport { enhance } from '$lib/form';\\r\\n;\\r\\n// see https://kit.svelte.dev/docs#loading\\r\\nexport const load = ({ fetch }) => __awaiter(void 0, void 0, void 0, function* () {\\r\\n    const res = yield fetch('/todos.json');\\r\\n    if (res.ok) {\\r\\n        const todos = yield res.json();\\r\\n        return {\\r\\n            props: { todos }\\r\\n        };\\r\\n    }\\r\\n    const { message } = yield res.json();\\r\\n    return {\\r\\n        error: new Error(message)\\r\\n    };\\r\\n});\\r\\n</script>\\n\\n<script lang=\\"ts\\">var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {\\r\\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\\r\\n    return new (P || (P = Promise))(function (resolve, reject) {\\r\\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\\r\\n        function rejected(value) { try { step(generator[\\"throw\\"](value)); } catch (e) { reject(e); } }\\r\\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\\r\\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\\r\\n    });\\r\\n};\\r\\nimport { scale } from 'svelte/transition';\\r\\nimport { flip } from 'svelte/animate';\\r\\nexport let todos;\\r\\nfunction patch(res) {\\r\\n    return __awaiter(this, void 0, void 0, function* () {\\r\\n        const todo = yield res.json();\\r\\n        todos = todos.map((t) => {\\r\\n            if (t.uid === todo.uid)\\r\\n                return todo;\\r\\n            return t;\\r\\n        });\\r\\n    });\\r\\n}\\r\\n</script>\\n\\n<svelte:head>\\n\\t<title>Todos</title>\\n</svelte:head>\\n\\n<div class=\\"todos\\">\\n\\t<h1>Todos</h1>\\n\\n\\t<form\\n\\t\\tclass=\\"new\\"\\n\\t\\taction=\\"/todos.json\\"\\n\\t\\tmethod=\\"post\\"\\n\\t\\tuse:enhance={{\\n\\t\\t\\tresult: async (res, form) => {\\n\\t\\t\\t\\tconst created = await res.json();\\n\\t\\t\\t\\ttodos = [...todos, created];\\n\\n\\t\\t\\t\\tform.reset();\\n\\t\\t\\t}\\n\\t\\t}}\\n\\t>\\n\\t\\t<input name=\\"text\\" placeholder=\\"+ tap to add a todo\\" />\\n\\t</form>\\n\\n\\t{#each todos as todo (todo.uid)}\\n\\t\\t<div\\n\\t\\t\\tclass=\\"todo\\"\\n\\t\\t\\tclass:done={todo.done}\\n\\t\\t\\ttransition:scale|local={{ start: 0.7 }}\\n\\t\\t\\tanimate:flip={{ duration: 200 }}\\n\\t\\t>\\n\\t\\t\\t<form\\n\\t\\t\\t\\taction=\\"/todos/{todo.uid}.json?_method=patch\\"\\n\\t\\t\\t\\tmethod=\\"post\\"\\n\\t\\t\\t\\tuse:enhance={{\\n\\t\\t\\t\\t\\tpending: (data) => {\\n\\t\\t\\t\\t\\t\\tconst done = !!data.get('done');\\n\\n\\t\\t\\t\\t\\t\\ttodos = todos.map((t) => {\\n\\t\\t\\t\\t\\t\\t\\tif (t === todo) return { ...t, done };\\n\\t\\t\\t\\t\\t\\t\\treturn t;\\n\\t\\t\\t\\t\\t\\t});\\n\\t\\t\\t\\t\\t},\\n\\t\\t\\t\\t\\tresult: patch\\n\\t\\t\\t\\t}}\\n\\t\\t\\t>\\n\\t\\t\\t\\t<input type=\\"hidden\\" name=\\"done\\" value={todo.done ? '' : 'true'} />\\n\\t\\t\\t\\t<button class=\\"toggle\\" aria-label=\\"Mark todo as {todo.done ? 'not done' : 'done'}\\" />\\n\\t\\t\\t</form>\\n\\n\\t\\t\\t<form\\n\\t\\t\\t\\tclass=\\"text\\"\\n\\t\\t\\t\\taction=\\"/todos/{todo.uid}.json?_method=patch\\"\\n\\t\\t\\t\\tmethod=\\"post\\"\\n\\t\\t\\t\\tuse:enhance={{\\n\\t\\t\\t\\t\\tresult: patch\\n\\t\\t\\t\\t}}\\n\\t\\t\\t>\\n\\t\\t\\t\\t<input type=\\"text\\" name=\\"text\\" value={todo.text} />\\n\\t\\t\\t\\t<button class=\\"save\\" aria-label=\\"Save todo\\" />\\n\\t\\t\\t</form>\\n\\n\\t\\t\\t<form\\n\\t\\t\\t\\taction=\\"/todos/{todo.uid}.json?_method=delete\\"\\n\\t\\t\\t\\tmethod=\\"post\\"\\n\\t\\t\\t\\tuse:enhance={{\\n\\t\\t\\t\\t\\tresult: () => {\\n\\t\\t\\t\\t\\t\\ttodos = todos.filter((t) => t.uid !== todo.uid);\\n\\t\\t\\t\\t\\t}\\n\\t\\t\\t\\t}}\\n\\t\\t\\t>\\n\\t\\t\\t\\t<button class=\\"delete\\" aria-label=\\"Delete todo\\" />\\n\\t\\t\\t</form>\\n\\t\\t</div>\\n\\t{/each}\\n</div>\\n\\n<style>.todos{line-height:1;margin:var(--column-margin-top) auto 0 auto;max-width:var(--column-width);width:100%}.new{margin:0 0 .5rem}input{border:1px solid transparent}input:focus-visible{border:1px solid violet!important;box-shadow:inset 1px 1px 6px rgba(0,0,0,.1);outline:none}.new input{background:hsla(0,0%,100%,.05);box-sizing:border-box;font-size:28px;padding:.5em 1em .3em;text-align:center;width:100%}.new input,.todo{border-radius:8px}.todo{grid-gap:.5rem;align-items:center;background-color:#fff;display:grid;filter:drop-shadow(2px 4px 6px rgba(0,0,0,.1));grid-template-columns:2rem 1fr 2rem;margin:0 0 .5rem;padding:.5rem;transform:translate(-1px,-1px);transition:filter .2s,transform .2s}.done{filter:drop-shadow(0 0 1px rgba(0,0,0,.1));opacity:.4;transform:none}form.text{align-items:center;display:flex;flex:1;position:relative}.todo input{border-radius:3px;flex:1;padding:.5em 2em .5em .8em}.todo button{background-color:transparent;background-position:50% 50%;background-repeat:no-repeat;border:none;height:2em;width:2em}button.toggle{background-size:1em auto;border:1px solid rgba(0,0,0,.2);border-radius:50%;box-sizing:border-box}.done .toggle{background-image:url(\\"data:image/svg+xml;charset=utf-8,%3Csvg width='22' height='16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='m20.5 1.5-13.063 13L1.5 8.59' stroke='%23676778' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\\")}.delete{background-image:url(\\"data:image/svg+xml;charset=utf-8,%3Csvg width='24' height='24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4.5 5v17h15V5h-15z' fill='%23676778' stroke='%23676778' stroke-width='1.5' stroke-linejoin='round'/%3E%3Cpath d='M10 10v6.5M14 10v6.5' stroke='%23fff' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M2 5h20' stroke='%23676778' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='m8 5 1.645-3h4.744L16 5H8z' fill='%23676778' stroke='%23676778' stroke-width='1.5' stroke-linejoin='round'/%3E%3C/svg%3E\\");opacity:.2}.delete:hover{opacity:1;transition:opacity .2s}.save{background-image:url(\\"data:image/svg+xml;charset=utf-8,%3Csvg width='24' height='24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2z' fill='%23676778' stroke='%23676778' stroke-width='1.5' stroke-linejoin='round'/%3E%3Cpath d='M17 2v9H7.5V2H17z' fill='%23fff' stroke='%23fff' stroke-width='1.5' stroke-linejoin='round'/%3E%3Cpath d='M13.5 5.5v2M5.998 2H18.5' stroke='%23676778' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\\");opacity:0;position:absolute;right:0}.todo input:focus+.save{opacity:1;transition:opacity .2s}</style>\\n"],"names":[],"mappings":"AA+HO,mDAAM,CAAC,YAAY,CAAC,CAAC,OAAO,IAAI,mBAAmB,CAAC,CAAC,IAAI,CAAC,CAAC,CAAC,IAAI,CAAC,UAAU,IAAI,cAAc,CAAC,CAAC,MAAM,IAAI,CAAC,iDAAI,CAAC,OAAO,CAAC,CAAC,CAAC,CAAC,KAAK,CAAC,kDAAK,CAAC,OAAO,GAAG,CAAC,KAAK,CAAC,WAAW,CAAC,kDAAK,cAAc,CAAC,OAAO,GAAG,CAAC,KAAK,CAAC,MAAM,UAAU,CAAC,WAAW,KAAK,CAAC,GAAG,CAAC,GAAG,CAAC,GAAG,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,EAAE,CAAC,CAAC,QAAQ,IAAI,CAAC,mBAAI,CAAC,mCAAK,CAAC,WAAW,KAAK,CAAC,CAAC,EAAE,CAAC,IAAI,CAAC,GAAG,CAAC,CAAC,WAAW,UAAU,CAAC,UAAU,IAAI,CAAC,QAAQ,IAAI,CAAC,GAAG,CAAC,IAAI,CAAC,WAAW,MAAM,CAAC,MAAM,IAAI,CAAC,mBAAI,CAAC,mCAAK,CAAC,kDAAK,CAAC,cAAc,GAAG,CAAC,kDAAK,CAAC,SAAS,KAAK,CAAC,YAAY,MAAM,CAAC,iBAAiB,IAAI,CAAC,QAAQ,IAAI,CAAC,OAAO,YAAY,GAAG,CAAC,GAAG,CAAC,GAAG,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,EAAE,CAAC,CAAC,CAAC,sBAAsB,IAAI,CAAC,GAAG,CAAC,IAAI,CAAC,OAAO,CAAC,CAAC,CAAC,CAAC,KAAK,CAAC,QAAQ,KAAK,CAAC,UAAU,UAAU,IAAI,CAAC,IAAI,CAAC,CAAC,WAAW,MAAM,CAAC,GAAG,CAAC,SAAS,CAAC,GAAG,CAAC,kDAAK,CAAC,OAAO,YAAY,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,EAAE,CAAC,CAAC,CAAC,QAAQ,EAAE,CAAC,UAAU,IAAI,CAAC,IAAI,kDAAK,CAAC,YAAY,MAAM,CAAC,QAAQ,IAAI,CAAC,KAAK,CAAC,CAAC,SAAS,QAAQ,CAAC,oBAAK,CAAC,mCAAK,CAAC,cAAc,GAAG,CAAC,KAAK,CAAC,CAAC,QAAQ,IAAI,CAAC,GAAG,CAAC,IAAI,CAAC,IAAI,CAAC,oBAAK,CAAC,oCAAM,CAAC,iBAAiB,WAAW,CAAC,oBAAoB,GAAG,CAAC,GAAG,CAAC,kBAAkB,SAAS,CAAC,OAAO,IAAI,CAAC,OAAO,GAAG,CAAC,MAAM,GAAG,CAAC,MAAM,oDAAO,CAAC,gBAAgB,GAAG,CAAC,IAAI,CAAC,OAAO,GAAG,CAAC,KAAK,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,EAAE,CAAC,CAAC,cAAc,GAAG,CAAC,WAAW,UAAU,CAAC,oBAAK,CAAC,qCAAO,CAAC,iBAAiB,IAAI,6PAA6P,CAAC,CAAC,oDAAO,CAAC,iBAAiB,IAAI,ykBAAykB,CAAC,CAAC,QAAQ,EAAE,CAAC,oDAAO,MAAM,CAAC,QAAQ,CAAC,CAAC,WAAW,OAAO,CAAC,GAAG,CAAC,kDAAK,CAAC,iBAAiB,IAAI,ohBAAohB,CAAC,CAAC,QAAQ,CAAC,CAAC,SAAS,QAAQ,CAAC,MAAM,CAAC,CAAC,oBAAK,CAAC,oBAAK,MAAM,CAAC,oBAAK,CAAC,QAAQ,CAAC,CAAC,WAAW,OAAO,CAAC,GAAG,CAAC"}`
};
var __awaiter = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve2) {
      resolve2(value);
    });
  }
  return new (P || (P = Promise))(function(resolve2, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
const load = ({fetch: fetch2}) => __awaiter(void 0, void 0, void 0, function* () {
  const res = yield fetch2("/todos.json");
  if (res.ok) {
    const todos = yield res.json();
    return {props: {todos}};
  }
  const {message} = yield res.json();
  return {error: new Error(message)};
});
const Todos = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  (function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve2) {
        resolve2(value);
      });
    }
    return new (P || (P = Promise))(function(resolve2, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  });
  let {todos} = $$props;
  if ($$props.todos === void 0 && $$bindings.todos && todos !== void 0)
    $$bindings.todos(todos);
  $$result.css.add(css);
  return `${$$result.head += `${$$result.title = `<title>Todos</title>`, ""}`, ""}

<div class="${"todos svelte-13wdnuf"}"><h1>Todos</h1>

	<form class="${"new svelte-13wdnuf"}" action="${"/todos.json"}" method="${"post"}"><input name="${"text"}" placeholder="${"+ tap to add a todo"}" class="${"svelte-13wdnuf"}"></form>

	${each(todos, (todo) => `<div class="${["todo svelte-13wdnuf", todo.done ? "done" : ""].join(" ").trim()}"><form action="${"/todos/" + escape(todo.uid) + ".json?_method=patch"}" method="${"post"}"><input type="${"hidden"}" name="${"done"}"${add_attribute("value", todo.done ? "" : "true", 0)} class="${"svelte-13wdnuf"}">
				<button class="${"toggle svelte-13wdnuf"}" aria-label="${"Mark todo as " + escape(todo.done ? "not done" : "done")}"></button></form>

			<form class="${"text svelte-13wdnuf"}" action="${"/todos/" + escape(todo.uid) + ".json?_method=patch"}" method="${"post"}"><input type="${"text"}" name="${"text"}"${add_attribute("value", todo.text, 0)} class="${"svelte-13wdnuf"}">
				<button class="${"save svelte-13wdnuf"}" aria-label="${"Save todo"}"></button></form>

			<form action="${"/todos/" + escape(todo.uid) + ".json?_method=delete"}" method="${"post"}"><button class="${"delete svelte-13wdnuf"}" aria-label="${"Delete todo"}"></button></form>
		</div>`)}
</div>`;
});
var index = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: Todos,
  load
});
export {init, render};
