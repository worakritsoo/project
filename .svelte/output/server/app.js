import {createHash} from "crypto";
import {parse, resolve} from "url";
import Fuse from "fuse.js";
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
        const parsed = parse(url);
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
function assign(tar, src) {
  for (const k in src)
    tar[k] = src[k];
  return tar;
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
function is_function(thing) {
  return typeof thing === "function";
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
function getContext(key) {
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
const css$3 = {
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
  $$result.css.add(css$3);
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
var user_hooks = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module"
});
const template = ({head, body}) => '<!DOCTYPE html>\n<html lang="en">\n	<head>\n		<meta charset="utf-8" />\n		<link rel="icon" href="/favicon.ico" />\n		<meta name="viewport" content="width=device-width, initial-scale=1" />\n		<script\n			type="module"\n			src="https://cdn.jsdelivr.net/npm/@ionic/core/dist/ionic/ionic.esm.js"\n		></script>\n		<script nomodule src="https://cdn.jsdelivr.net/npm/@ionic/core/dist/ionic/ionic.js"></script>\n		<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@ionic/core/css/ionic.bundle.css" />\n		' + head + '\n	</head>\n	<body>\n		<div id="svelte">' + body + "</div>\n	</body>\n</html>\n";
let options = null;
function init(settings) {
  set_paths(settings.paths);
  set_prerendering(settings.prerendering || false);
  options = {
    amp: false,
    dev: false,
    entry: {
      file: "/./_app/start-1d07e4d8.js",
      css: ["/./_app/assets/start-0826e215.css"],
      js: ["/./_app/start-1d07e4d8.js", "/./_app/chunks/vendor-0bc65d02.js"]
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
      pattern: /^\/ranking\/?$/,
      params: empty,
      a: ["src/routes/$layout.svelte", "src/routes/ranking/index.svelte"],
      b: [".svelte/build/components/error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/ranking\/ranking\/?$/,
      params: empty,
      a: ["src/routes/$layout.svelte", "src/routes/ranking/ranking.svelte"],
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
      type: "page",
      pattern: /^\/cards\/cardprofile\/?$/,
      params: empty,
      a: ["src/routes/$layout.svelte", "src/routes/cards/cardprofile.svelte"],
      b: [".svelte/build/components/error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/cards\/Login\/?$/,
      params: empty,
      a: ["src/routes/$layout.svelte", "src/routes/cards/Login.svelte"],
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
    },
    {
      type: "page",
      pattern: /^\/User\/?$/,
      params: empty,
      a: ["src/routes/$layout.svelte", "src/routes/User.svelte"],
      b: [".svelte/build/components/error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/news\/?$/,
      params: empty,
      a: ["src/routes/$layout.svelte", "src/routes/news/index.svelte"],
      b: [".svelte/build/components/error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/news\/summary\/?$/,
      params: empty,
      a: ["src/routes/$layout.svelte", "src/routes/news/summary.svelte"],
      b: [".svelte/build/components/error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/box\/?$/,
      params: empty,
      a: ["src/routes/$layout.svelte", "src/routes/box/index.svelte"],
      b: [".svelte/build/components/error.svelte"]
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
    return index$5;
  }),
  "src/routes/ranking/index.svelte": () => Promise.resolve().then(function() {
    return index$4;
  }),
  "src/routes/ranking/ranking.svelte": () => Promise.resolve().then(function() {
    return ranking;
  }),
  "src/routes/search/index.svelte": () => Promise.resolve().then(function() {
    return index$3;
  }),
  "src/routes/about.svelte": () => Promise.resolve().then(function() {
    return about;
  }),
  "src/routes/cards/cardprofile.svelte": () => Promise.resolve().then(function() {
    return cardprofile;
  }),
  "src/routes/cards/Login.svelte": () => Promise.resolve().then(function() {
    return Login$1;
  }),
  "src/routes/todos/index.svelte": () => Promise.resolve().then(function() {
    return index$2;
  }),
  "src/routes/User.svelte": () => Promise.resolve().then(function() {
    return User$1;
  }),
  "src/routes/news/index.svelte": () => Promise.resolve().then(function() {
    return index$1;
  }),
  "src/routes/news/summary.svelte": () => Promise.resolve().then(function() {
    return summary;
  }),
  "src/routes/box/index.svelte": () => Promise.resolve().then(function() {
    return index;
  })
};
const metadata_lookup = {"src/routes/$layout.svelte": {entry: "/./_app/pages/$layout.svelte-3aae97db.js", css: ["/./_app/assets/pages/$layout.svelte-a03e0467.css"], js: ["/./_app/pages/$layout.svelte-3aae97db.js", "/./_app/chunks/vendor-0bc65d02.js"], styles: null}, ".svelte/build/components/error.svelte": {entry: "/./_app/error.svelte-341a0eb8.js", css: [], js: ["/./_app/error.svelte-341a0eb8.js", "/./_app/chunks/vendor-0bc65d02.js"], styles: null}, "src/routes/index.svelte": {entry: "/./_app/pages/index.svelte-85f7d57b.js", css: [], js: ["/./_app/pages/index.svelte-85f7d57b.js", "/./_app/chunks/vendor-0bc65d02.js"], styles: null}, "src/routes/ranking/index.svelte": {entry: "/./_app/pages/ranking/index.svelte-c9af7bcb.js", css: [], js: ["/./_app/pages/ranking/index.svelte-c9af7bcb.js", "/./_app/chunks/vendor-0bc65d02.js"], styles: null}, "src/routes/ranking/ranking.svelte": {entry: "/./_app/pages/ranking/ranking.svelte-4200608b.js", css: [], js: ["/./_app/pages/ranking/ranking.svelte-4200608b.js", "/./_app/chunks/vendor-0bc65d02.js"], styles: null}, "src/routes/search/index.svelte": {entry: "/./_app/pages/search/index.svelte-5340fd99.js", css: ["/./_app/assets/Box.svelte_svelte&type=style&lang-c1911e66.css"], js: ["/./_app/pages/search/index.svelte-5340fd99.js", "/./_app/chunks/vendor-0bc65d02.js"], styles: null}, "src/routes/about.svelte": {entry: "/./_app/pages/about.svelte-37436fe0.js", css: [], js: ["/./_app/pages/about.svelte-37436fe0.js", "/./_app/chunks/vendor-0bc65d02.js"], styles: null}, "src/routes/cards/cardprofile.svelte": {entry: "/./_app/pages/cards/cardprofile.svelte-168a0f7b.js", css: [], js: ["/./_app/pages/cards/cardprofile.svelte-168a0f7b.js", "/./_app/chunks/vendor-0bc65d02.js"], styles: null}, "src/routes/cards/Login.svelte": {entry: "/./_app/pages/cards/Login.svelte-7badac9a.js", css: [], js: ["/./_app/pages/cards/Login.svelte-7badac9a.js", "/./_app/chunks/vendor-0bc65d02.js"], styles: null}, "src/routes/todos/index.svelte": {entry: "/./_app/pages/todos/index.svelte-00066898.js", css: ["/./_app/assets/pages/todos/index.svelte-0cc21db3.css"], js: ["/./_app/pages/todos/index.svelte-00066898.js", "/./_app/chunks/vendor-0bc65d02.js", "/./_app/chunks/index-0ee0897d.js"], styles: null}, "src/routes/User.svelte": {entry: "/./_app/pages/User.svelte-0cddcb04.js", css: [], js: ["/./_app/pages/User.svelte-0cddcb04.js", "/./_app/chunks/vendor-0bc65d02.js"], styles: null}, "src/routes/news/index.svelte": {entry: "/./_app/pages/news/index.svelte-757d1888.js", css: [], js: ["/./_app/pages/news/index.svelte-757d1888.js", "/./_app/chunks/vendor-0bc65d02.js"], styles: null}, "src/routes/news/summary.svelte": {entry: "/./_app/pages/news/summary.svelte-8a42bcb5.js", css: ["/./_app/assets/pages/news/summary.svelte-4c171519.css"], js: ["/./_app/pages/news/summary.svelte-8a42bcb5.js", "/./_app/chunks/vendor-0bc65d02.js"], styles: null}, "src/routes/box/index.svelte": {entry: "/./_app/pages/box/index.svelte-78d7995d.js", css: ["/./_app/assets/pages/box/index.svelte-6e16fefb.css", "/./_app/assets/Box.svelte_svelte&type=style&lang-c1911e66.css"], js: ["/./_app/pages/box/index.svelte-78d7995d.js", "/./_app/chunks/vendor-0bc65d02.js", "/./_app/chunks/index-0ee0897d.js"], styles: null}};
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
  const stores = getContext("__svelte__");
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
const UE0uB8uBANav = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  $$unsubscribe_page();
  return `<ion-content id="${"main"}"><ion-list><ion-item${add_classes([$page.path === "." ? "active" : ""].join(" ").trim())}><a sveltekit:prefetch href="${"/"}">\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E23\u0E01</a></ion-item>
		<ion-item${add_classes([$page.path === "/about" ? "active" : ""].join(" ").trim())}><a sveltekit:prefetch href="${"/about"}">\u0E40\u0E01\u0E35\u0E48\u0E22\u0E27\u0E01\u0E31\u0E1A\u0E40\u0E23\u0E32</a></ion-item>
		<ion-item${add_classes([$page.path === "/search" ? "active" : ""].join(" ").trim())}><a sveltekit:prefetch href="${"/search"}">\u0E04\u0E49\u0E19\u0E2B\u0E32</a></ion-item>
		
		<ion-item${add_classes([$page.path === "/box" ? "active" : ""].join(" ").trim())}><a sveltekit:prefetch href="${"/box"}">\u0E01\u0E25\u0E48\u0E2D\u0E07</a></ion-item>
		<ion-item${add_classes([$page.path === "/ranking" ? "active" : ""].join(" ").trim())}><a sveltekit:prefetch href="${"/ranking"}">\u0E08\u0E31\u0E14\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A</a></ion-item>
		<ion-item${add_classes([$page.path === "/news" ? "active" : ""].join(" ").trim())}><a sveltekit:prefetch href="${"/news"}">\u0E02\u0E48\u0E32\u0E27\u0E2A\u0E32\u0E23</a></ion-item></ion-list></ion-content>`;
});
var index_svelte_svelte_type_style_lang$1 = "nav.svelte-14xcsjm{--tw-bg-opacity:1;--tw-bg-opacity:0.25;background-color:rgba(0,0,255,var(--tw-bg-opacity));font-size:1.25rem;line-height:1.75rem;padding:1.25rem}nav.svelte-14xcsjm:focus{--tw-border-opacity:1;border-color:rgba(0,0,255,var(--tw-border-opacity))}";
const css$2 = {
  code: "nav.svelte-14xcsjm{--tw-bg-opacity:1;--tw-bg-opacity:0.25;background-color:rgba(0,0,255,var(--tw-bg-opacity));font-size:1.25rem;line-height:1.75rem;padding:1.25rem}nav.svelte-14xcsjm:focus{--tw-border-opacity:1;border-color:rgba(0,0,255,var(--tw-border-opacity))}",
  map: `{"version":3,"file":"index.svelte","sources":["index.svelte"],"sourcesContent":["<script lang=\\"ts\\">import { page } from '$app/stores';\\r\\nimport logo from './svelte-logo.svg';\\r\\nexport const translate = 'no';\\r\\n</script>\\n\\n<ion-header>\\n\\t<nav>\\n\\t\\t<ul class=\\"flex justify-between\\">\\n\\t\\t\\t<strong>PEA</strong>\\n\\t\\t\\t<div class=\\"flex gap-5 justify-end sm: text-sm\\">\\n\\t\\t\\t\\t<li class:active={$page.path === '/'}><a sveltekit:prefetch href=\\"/\\">\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E23\u0E01</a></li>\\n\\t\\t\\t\\t<li class:active={$page.path === '/search'}>\\n\\t\\t\\t\\t\\t<a sveltekit:prefetch href=\\"/search\\">\u0E04\u0E49\u0E19\u0E2B\u0E32</a>\\n\\t\\t\\t\\t</li>\\n\\t\\t\\t\\t<li class:active={$page.path === '/about'}>\\n\\t\\t\\t\\t\\t<a sveltekit:prefetch href=\\"/about\\">\u0E40\u0E01\u0E35\u0E48\u0E22\u0E27\u0E01\u0E31\u0E1A\u0E40\u0E23\u0E32</a>\\n\\t\\t\\t\\t</li>\\n\\t\\t\\t</div>\\n\\t\\t</ul>\\n\\t</nav>\\n</ion-header>\\n\\n<style>nav{--tw-bg-opacity:1;--tw-bg-opacity:0.25;background-color:rgba(0,0,255,var(--tw-bg-opacity));font-size:1.25rem;line-height:1.75rem;padding:1.25rem}nav:focus{--tw-border-opacity:1;border-color:rgba(0,0,255,var(--tw-border-opacity))}</style>\\n"],"names":[],"mappings":"AAsBO,kBAAG,CAAC,gBAAgB,CAAC,CAAC,gBAAgB,IAAI,CAAC,iBAAiB,KAAK,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,IAAI,eAAe,CAAC,CAAC,CAAC,UAAU,OAAO,CAAC,YAAY,OAAO,CAAC,QAAQ,OAAO,CAAC,kBAAG,MAAM,CAAC,oBAAoB,CAAC,CAAC,aAAa,KAAK,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,IAAI,mBAAmB,CAAC,CAAC,CAAC"}`
};
const Header = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  const translate = "no";
  if ($$props.translate === void 0 && $$bindings.translate && translate !== void 0)
    $$bindings.translate(translate);
  $$result.css.add(css$2);
  $$unsubscribe_page();
  return `<ion-header><nav class="${"svelte-14xcsjm"}"><ul class="${"flex justify-between"}"><strong>PEA</strong>
			<div class="${"flex gap-5 justify-end sm: text-sm"}"><li${add_classes([$page.path === "/" ? "active" : ""].join(" ").trim())}><a sveltekit:prefetch href="${"/"}">\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E23\u0E01</a></li>
				<li${add_classes([$page.path === "/search" ? "active" : ""].join(" ").trim())}><a sveltekit:prefetch href="${"/search"}">\u0E04\u0E49\u0E19\u0E2B\u0E32</a></li>
				<li${add_classes([$page.path === "/about" ? "active" : ""].join(" ").trim())}><a sveltekit:prefetch href="${"/about"}">\u0E40\u0E01\u0E35\u0E48\u0E22\u0E27\u0E01\u0E31\u0E1A\u0E40\u0E23\u0E32</a></li></div></ul></nav>
</ion-header>`;
});
var app = ":root{--ion-color-pea:#8668f3;--ion-color-pea-rgb:134,104,243;--ion-color-pea-contrast:#000;--ion-color-pea-contrast-rgb:0,0,0;--ion-color-pea-shade:#765cd6;--ion-color-pea-tint:#9277f4;$h:170;--color-favorite:hsl(h,50%,50%)}.ion-color-pea{--ion-color-base:var(--ion-color-pea);--ion-color-base-rgb:var(--ion-color-pea-rgb);--ion-color-contrast:var(--ion-color-pea-contrast);--ion-color-contrast-rgb:var(--ion-color-pea-contrast-rgb);--ion-color-shade:var(--ion-color-pea-shade);--ion-color-tint:var(--ion-color-pea-tint)}:root{--ion-color-blue:#080892;--ion-color-blue-rgb:8,8,146;--ion-color-blue-contrast:#fff;--ion-color-blue-contrast-rgb:255,255,255;--ion-color-blue-shade:#070780;--ion-color-blue-tint:#21219d}.ion-color-blue{--ion-color-base:var(--ion-color-blue);--ion-color-base-rgb:var(--ion-color-blue-rgb);--ion-color-contrast:var(--ion-color-blue-contrast);--ion-color-contrast-rgb:var(--ion-color-blue-contrast-rgb);--ion-color-shade:var(--ion-color-blue-shade);--ion-color-tint:var(--ion-color-blue-tint)}:root{--ion-color-bluesky:#34a8a0;--ion-color-bluesky-rgb:52,168,160;--ion-color-bluesky-contrast:#000;--ion-color-bluesky-contrast-rgb:0,0,0;--ion-color-bluesky-shade:#2e948d;--ion-color-bluesky-tint:#48b1aa}.ion-color-bluesky{--ion-color-base:var(--ion-color-bluesky);--ion-color-base-rgb:var(--ion-color-bluesky-rgb);--ion-color-contrast:var(--ion-color-bluesky-contrast);--ion-color-contrast-rgb:var(--ion-color-bluesky-contrast-rgb);--ion-color-shade:var(--ion-color-bluesky-shade);--ion-color-tint:var(--ion-color-bluesky-tint)}\n\n/*! tailwindcss v2.1.1 | MIT License | https://tailwindcss.com*/\n\n/*! modern-normalize v1.0.0 | MIT License | https://github.com/sindresorhus/modern-normalize */:root{-moz-tab-size:4;-o-tab-size:4;tab-size:4}html{line-height:1.15;-webkit-text-size-adjust:100%}body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji;margin:0}hr{color:inherit;height:0}abbr[title]{-webkit-text-decoration:underline dotted;text-decoration:underline dotted}b,strong{font-weight:bolder}code,kbd,pre,samp{font-family:ui-monospace,SFMono-Regular,Consolas,Liberation Mono,Menlo,monospace;font-size:1em}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sub{bottom:-.25em}sup{top:-.5em}table{border-color:inherit;text-indent:0}button,input,optgroup,select,textarea{font-family:inherit;font-size:100%;line-height:1.15;margin:0}button,select{text-transform:none}[type=button],[type=reset],[type=submit],button{-webkit-appearance:button}::-moz-focus-inner{border-style:none;padding:0}:-moz-focusring{outline:1px dotted ButtonText}:-moz-ui-invalid{box-shadow:none}legend{padding:0}progress{vertical-align:baseline}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}summary{display:list-item}blockquote,dd,dl,figure,h1,h2,h3,h4,h5,h6,hr,p,pre{margin:0}button{background-color:transparent;background-image:none}button:focus{outline:1px dotted;outline:5px auto -webkit-focus-ring-color}fieldset,ol,ul{margin:0;padding:0}ol,ul{list-style:none}html{font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;line-height:1.5}body{font-family:inherit;line-height:inherit}*,:after,:before{border:0 solid #e5e7eb;box-sizing:border-box}hr{border-top-width:1px}img{border-style:solid}textarea{resize:vertical}input::-moz-placeholder,textarea::-moz-placeholder{color:#9ca3af;opacity:1}input:-ms-input-placeholder,textarea:-ms-input-placeholder{color:#9ca3af;opacity:1}input::placeholder,textarea::placeholder{color:#9ca3af;opacity:1}[role=button],button{cursor:pointer}table{border-collapse:collapse}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;text-decoration:inherit}button,input,optgroup,select,textarea{color:inherit;line-height:inherit;padding:0}code,kbd,pre,samp{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace}audio,canvas,embed,iframe,img,object,svg,video{display:block;vertical-align:middle}img,video{height:auto;max-width:100%}*{--tw-shadow:0 0 transparent;--tw-ring-inset:var(--tw-empty,/*!*/ /*!*/);--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(59,130,246,0.5);--tw-ring-offset-shadow:0 0 transparent;--tw-ring-shadow:0 0 transparent}button{--tw-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);border-radius:.375rem;box-shadow:var(--tw-ring-offset-shadow,0 0 transparent),var(--tw-ring-shadow,0 0 transparent),var(--tw-shadow)}.primary{--tw-bg-opacity:1;--tw-text-opacity:1;background-color:rgba(139,92,246,var(--tw-bg-opacity));color:rgba(255,255,255,var(--tw-text-opacity))}.primary:hover{--tw-bg-opacity:1;background-color:rgba(109,40,217,var(--tw-bg-opacity))}.container{width:100%}@media (min-width:640px){.container{max-width:640px}}@media (min-width:768px){.container{max-width:768px}}@media (min-width:1024px){.container{max-width:1024px}}@media (min-width:1280px){.container{max-width:1280px}}@media (min-width:1536px){.container{max-width:1536px}}.static{position:static}.fixed{position:fixed}.absolute{position:absolute}.relative{position:relative}.m-5{margin:1.25rem}.m-6{margin:1.5rem}.-m-2{margin:-.5rem}.my-40{margin-bottom:10rem;margin-top:10rem}.mx-auto{margin-left:auto;margin-right:auto}.my-5{margin-bottom:1.25rem;margin-top:1.25rem}.mr-4{margin-right:1rem}.mb-16{margin-bottom:4rem}.mb-4{margin-bottom:1rem}.mb-8{margin-bottom:2rem}.ml-4{margin-left:1rem}.mt-1{margin-top:.25rem}.mt-2{margin-top:.5rem}.ml-6{margin-left:1.5rem}.mb-20{margin-bottom:5rem}.block{display:block}.flex{display:flex}.inline-flex{display:inline-flex}.grid{display:grid}.hidden{display:none}.h-full{height:100%}.h-16{height:4rem}.h-12{height:3rem}.h-48{height:12rem}.h-24{height:6rem}.w-1\\/4{width:25%}.w-full{width:100%}.w-16{width:4rem}.w-3\\/12{width:25%}.w-12{width:3rem}.w-5\\/6{width:83.333333%}.max-w-sm{max-width:24rem}.max-w-md{max-width:28rem}.flex-shrink-0{flex-shrink:0}.flex-grow{flex-grow:1}.transform{--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;transform:translateX(var(--tw-translate-x)) translateY(var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.flex-col{flex-direction:column}.flex-wrap{flex-wrap:wrap}.items-center{align-items:center}.justify-center{justify-content:center}.justify-between{justify-content:space-between}.justify-end{justify-content:flex-end}.gap-5{gap:1.25rem}.space-y-2>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-bottom:calc(.5rem*var(--tw-space-y-reverse));margin-top:calc(.5rem*(1 - var(--tw-space-y-reverse)))}.space-y-0\\.5>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-bottom:calc(.125rem*var(--tw-space-y-reverse));margin-top:calc(.125rem*(1 - var(--tw-space-y-reverse)))}.space-y-0>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-bottom:calc(0px*var(--tw-space-y-reverse));margin-top:calc(0px*(1 - var(--tw-space-y-reverse)))}.space-x-4>:not([hidden])~:not([hidden]){--tw-space-x-reverse:0;margin-left:calc(1rem*(1 - var(--tw-space-x-reverse)));margin-right:calc(1rem*var(--tw-space-x-reverse))}.overflow-hidden{overflow:hidden}.rounded-lg{border-radius:.5rem}.rounded-full{border-radius:9999px}.rounded-xl{border-radius:.75rem}.rounded{border-radius:.25rem}.border{border-width:1px}.border-0{border-width:0}.border-gray-200{--tw-border-opacity:1;border-color:rgba(229,231,235,var(--tw-border-opacity))}.border-purple-200{--tw-border-opacity:1;border-color:rgba(221,214,254,var(--tw-border-opacity))}.bg-gray-100{--tw-bg-opacity:1;background-color:rgba(243,244,246,var(--tw-bg-opacity))}.bg-blue-400{--tw-bg-opacity:1;background-color:rgba(96,165,250,var(--tw-bg-opacity))}.bg-purple-600{--tw-bg-opacity:1;background-color:rgba(124,58,237,var(--tw-bg-opacity))}.bg-white{--tw-bg-opacity:1;background-color:rgba(255,255,255,var(--tw-bg-opacity))}.bg-gray-900{--tw-bg-opacity:1;background-color:rgba(17,24,39,var(--tw-bg-opacity))}.bg-purple-500{--tw-bg-opacity:1;background-color:rgba(139,92,246,var(--tw-bg-opacity))}.bg-gray-800{--tw-bg-opacity:1;background-color:rgba(31,41,55,var(--tw-bg-opacity))}.bg-\\[\\#800880\\]{--tw-bg-opacity:1;background-color:rgba(128,8,128,var(--tw-bg-opacity))}.bg-\\[\\#0000FF\\]{--tw-bg-opacity:1;background-color:rgba(0,0,255,var(--tw-bg-opacity))}.bg-purple-200{--tw-bg-opacity:1;background-color:rgba(221,214,254,var(--tw-bg-opacity))}.bg-opacity-25{--tw-bg-opacity:0.25}.object-cover{-o-object-fit:cover;object-fit:cover}.object-center{-o-object-position:center;object-position:center}.p-2{padding:.5rem}.p-4{padding:1rem}.p-6{padding:1.5rem}.p-8{padding:2rem}.p-5{padding:1.25rem}.py-8{padding-bottom:2rem;padding-top:2rem}.px-8{padding-left:2rem;padding-right:2rem}.px-4{padding-left:1rem;padding-right:1rem}.py-1{padding-bottom:.25rem;padding-top:.25rem}.px-2{padding-left:.5rem;padding-right:.5rem}.px-5{padding-left:1.25rem;padding-right:1.25rem}.py-24{padding-bottom:6rem;padding-top:6rem}.py-2{padding-bottom:.5rem;padding-top:.5rem}.px-6{padding-left:1.5rem;padding-right:1.5rem}.pt-1{padding-top:.25rem}.text-center{text-align:center}.text-2xl{font-size:1.5rem;line-height:2rem}.text-lg{font-size:1.125rem;line-height:1.75rem}.text-sm{font-size:.875rem;line-height:1.25rem}.text-xl{font-size:1.25rem;line-height:1.75rem}.text-3xl{font-size:1.875rem;line-height:2.25rem}.text-base{font-size:1rem;line-height:1.5rem}.font-medium{font-weight:500}.font-semibold{font-weight:600}.font-bold{font-weight:700}.uppercase{text-transform:uppercase}.leading-relaxed{line-height:1.625}.leading-tight{line-height:1.25}.tracking-wide{letter-spacing:.025em}.text-gray-900{--tw-text-opacity:1;color:rgba(17,24,39,var(--tw-text-opacity))}.text-gray-500{--tw-text-opacity:1;color:rgba(107,114,128,var(--tw-text-opacity))}.text-black{--tw-text-opacity:1;color:rgba(0,0,0,var(--tw-text-opacity))}.text-purple-600{--tw-text-opacity:1;color:rgba(124,58,237,var(--tw-text-opacity))}.text-gray-400{--tw-text-opacity:1;color:rgba(156,163,175,var(--tw-text-opacity))}.text-white{--tw-text-opacity:1;color:rgba(255,255,255,var(--tw-text-opacity))}.text-indigo-500{--tw-text-opacity:1;color:rgba(99,102,241,var(--tw-text-opacity))}.text-gray-800{--tw-text-opacity:1;color:rgba(31,41,55,var(--tw-text-opacity))}.text-gray-600{--tw-text-opacity:1;color:rgba(75,85,99,var(--tw-text-opacity))}.shadow-md{--tw-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06)}.shadow-md,.shadow-xl{box-shadow:var(--tw-ring-offset-shadow,0 0 transparent),var(--tw-ring-shadow,0 0 transparent),var(--tw-shadow)}.shadow-xl{--tw-shadow:0 20px 25px -5px rgba(0,0,0,0.1),0 10px 10px -5px rgba(0,0,0,0.04)}.filter{--tw-blur:var(--tw-empty,/*!*/ /*!*/);--tw-brightness:var(--tw-empty,/*!*/ /*!*/);--tw-contrast:var(--tw-empty,/*!*/ /*!*/);--tw-grayscale:var(--tw-empty,/*!*/ /*!*/);--tw-hue-rotate:var(--tw-empty,/*!*/ /*!*/);--tw-invert:var(--tw-empty,/*!*/ /*!*/);--tw-saturate:var(--tw-empty,/*!*/ /*!*/);--tw-sepia:var(--tw-empty,/*!*/ /*!*/);--tw-drop-shadow:var(--tw-empty,/*!*/ /*!*/);filter:var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)}.drop-shadow{--tw-drop-shadow:drop-shadow(0 1px 2px rgba(0,0,0,0.1)) drop-shadow(0 1px 1px rgba(0,0,0,0.06))}.transition{transition-property:background-color,border-color,color,fill,stroke,opacity,box-shadow,transform,filter,-webkit-backdrop-filter;transition-property:background-color,border-color,color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter;transition-property:background-color,border-color,color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter,-webkit-backdrop-filter;transition-timing-function:cubic-bezier(.4,0,.2,1)}.duration,.transition{transition-duration:.15s}.hover\\:border-transparent:hover{border-color:transparent}.hover\\:bg-purple-700:hover{--tw-bg-opacity:1;background-color:rgba(109,40,217,var(--tw-bg-opacity))}.hover\\:bg-purple-600:hover{--tw-bg-opacity:1;background-color:rgba(124,58,237,var(--tw-bg-opacity))}.hover\\:bg-gray-700:hover{--tw-bg-opacity:1;background-color:rgba(55,65,81,var(--tw-bg-opacity))}.hover\\:bg-purple-300:hover{--tw-bg-opacity:1;background-color:rgba(196,181,253,var(--tw-bg-opacity))}.hover\\:bg-opacity-40:hover{--tw-bg-opacity:0.4}.hover\\:text-white:hover{--tw-text-opacity:1;color:rgba(255,255,255,var(--tw-text-opacity))}.hover\\:underline:hover{text-decoration:underline}.focus\\:outline-none:focus{outline:2px solid transparent;outline-offset:2px}.focus\\:ring-2:focus{--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow,0 0 transparent)}.focus\\:ring-purple-600:focus{--tw-ring-opacity:1;--tw-ring-color:rgba(124,58,237,var(--tw-ring-opacity))}.focus\\:ring-opacity-50:focus{--tw-ring-opacity:0.5}.focus\\:ring-offset-2:focus{--tw-ring-offset-width:2px}@media (min-width:640px){.sm\\:mx-0{margin-left:0;margin-right:0}.sm\\:flex{display:flex}.sm\\:flex-shrink-0{flex-shrink:0}.sm\\:items-center{align-items:center}.sm\\:space-y-0>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-bottom:calc(0px*var(--tw-space-y-reverse));margin-top:calc(0px*(1 - var(--tw-space-y-reverse)))}.sm\\:space-x-6>:not([hidden])~:not([hidden]){--tw-space-x-reverse:0;margin-left:calc(1.5rem*(1 - var(--tw-space-x-reverse)));margin-right:calc(1.5rem*var(--tw-space-x-reverse))}.sm\\:py-4{padding-bottom:1rem;padding-top:1rem}.sm\\:text-left{text-align:left}.sm\\:text-4xl{font-size:2.25rem;line-height:2.5rem}.sm\\:text-3xl{font-size:1.875rem;line-height:2.25rem}}@media (min-width:768px){.md\\:mb-0{margin-bottom:0}.md\\:flex{display:flex}.md\\:w-1\\/2{width:50%}.md\\:w-48{width:12rem}.md\\:max-w-2xl{max-width:42rem}.md\\:flex-shrink-0{flex-shrink:0}.md\\:flex-row{flex-direction:row}.md\\:items-start{align-items:flex-start}.md\\:pr-16{padding-right:4rem}.md\\:text-left{text-align:left}}@media (min-width:1024px){.lg\\:inline-block{display:inline-block}.lg\\:w-1\\/3{width:33.333333%}.lg\\:w-full{width:100%}.lg\\:w-4{width:1rem}.lg\\:w-2\\/3{width:66.666667%}.lg\\:max-w-lg{max-width:32rem}.lg\\:flex-grow{flex-grow:1}.lg\\:pr-24{padding-right:6rem}}";
const $layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<body><ion-split-pane content-id="${"main"}">
		<ion-menu content-id="${"main"}">${validate_component(UE0uB8uBANav, "Nav").$$render($$result, {}, {}, {})}</ion-menu>
		<ion-content id="${"main"}">${validate_component(Header, "Header").$$render($$result, {}, {}, {})}

			<div class="${"container"}">${slots.default ? slots.default({}) : ``}</div></ion-content></ion-split-pane>
	
</body>`;
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
const Routes = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<section><div class="${"container"}"><div class="${"block"}"><ion-item><ion-input type="${"text"}"><ion-label class="${"w-1/4"}">\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E25\u0E02\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19</ion-label></ion-input></ion-item>
			<ion-item><ion-input type="${"password"}"><ion-label class="${"w-1/4"}">\u0E23\u0E2B\u0E31\u0E2A\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19</ion-label></ion-input></ion-item></div>
		<div class="${"flex flex-col"}"><ion-button type="${"submit"}">\u0E25\u0E07\u0E0A\u0E37\u0E48\u0E2D\u0E40\u0E02\u0E49\u0E32\u0E43\u0E0A\u0E49</ion-button>
			<ion-button type="${"button"}" color="${"light"}">Not yet a member? Sign up! </ion-button></div></div>
</section>`;
});
var index$5 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: Routes
});
const Ranking$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${slots.default ? slots.default({}) : ``}
<section class="${"text-gray-600 body-font"}"><div class="${"container px-5 py-24 mx-auto"}"><div class="${"flex flex-col text-center w-full mb-20"}"><h1 class="${"sm:text-3xl text-2xl font-medium title-font mb-4 text-gray-900"}">\u0E20\u0E32\u0E1E\u0E23\u0E27\u0E21</h1>
			<p class="${"lg:w-2/3 mx-auto leading-relaxed text-base"}">\u0E41\u0E22\u0E01\u0E15\u0E32\u0E21\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E15\u0E48\u0E32\u0E07 \u0E46</p></div>
		<div class="${"flex flex-wrap -m-2"}"><div class="${"p-2 lg:w-1/3 md:w-1/2 w-full"}"><div class="${"h-full flex items-center border-gray-200 border p-4 rounded-lg"}"><img alt="${"team"}" class="${"w-16 h-16 bg-gray-100 object-cover object-center flex-shrink-0 rounded-full mr-4"}" src="${"https://dummyimage.com/80x80"}">
					<div class="${"flex-grow"}"><h2 class="${"text-gray-900 title-font font-medium"}">\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E14\u0E49\u0E32\u0E19</h2>
						<p class="${"text-gray-500"}">UI Designer</p></div></div></div>
			<div class="${"p-2 lg:w-1/3 md:w-1/2 w-full"}"><div class="${"h-full flex items-center border-gray-200 border p-4 rounded-lg"}"><img alt="${"team"}" class="${"w-16 h-16 bg-gray-100 object-cover object-center flex-shrink-0 rounded-full mr-4"}" src="${"https://dummyimage.com/84x84"}">
					<div class="${"flex-grow"}"><h2 class="${"text-gray-900 title-font font-medium"}">\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E14\u0E49\u0E32\u0E19</h2>
						<p class="${"text-gray-500"}">CTO</p></div></div></div>
			<div class="${"p-2 lg:w-1/3 md:w-1/2 w-full"}"><div class="${"h-full flex items-center border-gray-200 border p-4 rounded-lg"}"><img alt="${"team"}" class="${"w-16 h-16 bg-gray-100 object-cover object-center flex-shrink-0 rounded-full mr-4"}" src="${"https://dummyimage.com/88x88"}">
					<div class="${"flex-grow"}"><h2 class="${"text-gray-900 title-font font-medium"}">\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E14\u0E49\u0E32\u0E19</h2>
						<p class="${"text-gray-500"}">Founder</p></div></div></div>
			<div class="${"p-2 lg:w-1/3 md:w-1/2 w-full"}"><div class="${"h-full flex items-center border-gray-200 border p-4 rounded-lg"}"><img alt="${"team"}" class="${"w-16 h-16 bg-gray-100 object-cover object-center flex-shrink-0 rounded-full mr-4"}" src="${"https://dummyimage.com/90x90"}">
					<div class="${"flex-grow"}"><h2 class="${"text-gray-900 title-font font-medium"}">\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E14\u0E49\u0E32\u0E19</h2>
						<p class="${"text-gray-500"}">DevOps</p></div></div></div>
			<div class="${"p-2 lg:w-1/3 md:w-1/2 w-full"}"><div class="${"h-full flex items-center border-gray-200 border p-4 rounded-lg"}"><img alt="${"team"}" class="${"w-16 h-16 bg-gray-100 object-cover object-center flex-shrink-0 rounded-full mr-4"}" src="${"https://dummyimage.com/94x94"}">
					<div class="${"flex-grow"}"><h2 class="${"text-gray-900 title-font font-medium"}">\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E14\u0E49\u0E32\u0E19</h2>
						<p class="${"text-gray-500"}">Software Engineer</p></div></div></div>
			<div class="${"p-2 lg:w-1/3 md:w-1/2 w-full"}"><div class="${"h-full flex items-center border-gray-200 border p-4 rounded-lg"}"><img alt="${"team"}" class="${"w-16 h-16 bg-gray-100 object-cover object-center flex-shrink-0 rounded-full mr-4"}" src="${"https://dummyimage.com/98x98"}">
					<div class="${"flex-grow"}"><h2 class="${"text-gray-900 title-font font-medium"}">\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E14\u0E49\u0E32\u0E19</h2>
						<p class="${"text-gray-500"}">UX Researcher</p></div></div></div>
			<div class="${"p-2 lg:w-1/3 md:w-1/2 w-full"}"><div class="${"h-full flex items-center border-gray-200 border p-4 rounded-lg"}"><img alt="${"team"}" class="${"w-16 h-16 bg-gray-100 object-cover object-center flex-shrink-0 rounded-full mr-4"}" src="${"https://dummyimage.com/100x90"}">
					<div class="${"flex-grow"}"><h2 class="${"text-gray-900 title-font font-medium"}">\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E14\u0E49\u0E32\u0E19</h2>
						<p class="${"text-gray-500"}">QA Engineer</p></div></div></div>
			<div class="${"p-2 lg:w-1/3 md:w-1/2 w-full"}"><div class="${"h-full flex items-center border-gray-200 border p-4 rounded-lg"}"><img alt="${"team"}" class="${"w-16 h-16 bg-gray-100 object-cover object-center flex-shrink-0 rounded-full mr-4"}" src="${"https://dummyimage.com/104x94"}">
					<div class="${"flex-grow"}"><h2 class="${"text-gray-900 title-font font-medium"}">\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E14\u0E49\u0E32\u0E19</h2>
						<p class="${"text-gray-500"}">System</p></div></div></div>
			<div class="${"p-2 lg:w-1/3 md:w-1/2 w-full"}"><div class="${"h-full flex items-center border-gray-200 border p-4 rounded-lg"}"><img alt="${"team"}" class="${"w-16 h-16 bg-gray-100 object-cover object-center flex-shrink-0 rounded-full mr-4"}" src="${"https://dummyimage.com/108x98"}">
					<div class="${"flex-grow"}"><h2 class="${"text-gray-900 title-font font-medium"}">\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E14\u0E49\u0E32\u0E19</h2>
						<p class="${"text-gray-500"}">Product Manager</p></div></div></div></div></div></section>`;
});
var index$4 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: Ranking$1
});
const Ranking = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<section class="${"text-gray-600 body-font"}"><div class="${"container px-5 py-24 mx-auto"}"><div class="${"flex flex-col text-center w-full mb-20"}"><h1 class="${"sm:text-3xl text-2xl font-medium title-font mb-4 text-gray-900"}">\u0E20\u0E32\u0E1E\u0E23\u0E27\u0E21</h1>
			<p class="${"lg:w-2/3 mx-auto leading-relaxed text-base"}">\u0E41\u0E22\u0E01\u0E15\u0E32\u0E21\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E15\u0E48\u0E32\u0E07 \u0E46</p></div>
		<div class="${"flex flex-wrap -m-2"}"><div class="${"p-2 lg:w-1/3 md:w-1/2 w-full"}"><div class="${"h-full flex items-center border-gray-200 border p-4 rounded-lg"}"><img alt="${"team"}" class="${"w-16 h-16 bg-gray-100 object-cover object-center flex-shrink-0 rounded-full mr-4"}" src="${"https://dummyimage.com/80x80"}">
					<div class="${"flex-grow"}"><h2 class="${"text-gray-900 title-font font-medium"}">\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E14\u0E49\u0E32\u0E19</h2>
						<p class="${"text-gray-500"}">UI Designer</p></div></div></div>
			<div class="${"p-2 lg:w-1/3 md:w-1/2 w-full"}"><div class="${"h-full flex items-center border-gray-200 border p-4 rounded-lg"}"><img alt="${"team"}" class="${"w-16 h-16 bg-gray-100 object-cover object-center flex-shrink-0 rounded-full mr-4"}" src="${"https://dummyimage.com/84x84"}">
					<div class="${"flex-grow"}"><h2 class="${"text-gray-900 title-font font-medium"}">\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E14\u0E49\u0E32\u0E19</h2>
						<p class="${"text-gray-500"}">CTO</p></div></div></div>
			<div class="${"p-2 lg:w-1/3 md:w-1/2 w-full"}"><div class="${"h-full flex items-center border-gray-200 border p-4 rounded-lg"}"><img alt="${"team"}" class="${"w-16 h-16 bg-gray-100 object-cover object-center flex-shrink-0 rounded-full mr-4"}" src="${"https://dummyimage.com/88x88"}">
					<div class="${"flex-grow"}"><h2 class="${"text-gray-900 title-font font-medium"}">\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E14\u0E49\u0E32\u0E19</h2>
						<p class="${"text-gray-500"}">Founder</p></div></div></div>
			<div class="${"p-2 lg:w-1/3 md:w-1/2 w-full"}"><div class="${"h-full flex items-center border-gray-200 border p-4 rounded-lg"}"><img alt="${"team"}" class="${"w-16 h-16 bg-gray-100 object-cover object-center flex-shrink-0 rounded-full mr-4"}" src="${"https://dummyimage.com/90x90"}">
					<div class="${"flex-grow"}"><h2 class="${"text-gray-900 title-font font-medium"}">\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E14\u0E49\u0E32\u0E19</h2>
						<p class="${"text-gray-500"}">DevOps</p></div></div></div>
			<div class="${"p-2 lg:w-1/3 md:w-1/2 w-full"}"><div class="${"h-full flex items-center border-gray-200 border p-4 rounded-lg"}"><img alt="${"team"}" class="${"w-16 h-16 bg-gray-100 object-cover object-center flex-shrink-0 rounded-full mr-4"}" src="${"https://dummyimage.com/94x94"}">
					<div class="${"flex-grow"}"><h2 class="${"text-gray-900 title-font font-medium"}">\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E14\u0E49\u0E32\u0E19</h2>
						<p class="${"text-gray-500"}">Software Engineer</p></div></div></div>
			<div class="${"p-2 lg:w-1/3 md:w-1/2 w-full"}"><div class="${"h-full flex items-center border-gray-200 border p-4 rounded-lg"}"><img alt="${"team"}" class="${"w-16 h-16 bg-gray-100 object-cover object-center flex-shrink-0 rounded-full mr-4"}" src="${"https://dummyimage.com/98x98"}">
					<div class="${"flex-grow"}"><h2 class="${"text-gray-900 title-font font-medium"}">\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E14\u0E49\u0E32\u0E19</h2>
						<p class="${"text-gray-500"}">UX Researcher</p></div></div></div>
			<div class="${"p-2 lg:w-1/3 md:w-1/2 w-full"}"><div class="${"h-full flex items-center border-gray-200 border p-4 rounded-lg"}"><img alt="${"team"}" class="${"w-16 h-16 bg-gray-100 object-cover object-center flex-shrink-0 rounded-full mr-4"}" src="${"https://dummyimage.com/100x90"}">
					<div class="${"flex-grow"}"><h2 class="${"text-gray-900 title-font font-medium"}">\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E14\u0E49\u0E32\u0E19</h2>
						<p class="${"text-gray-500"}">QA Engineer</p></div></div></div>
			<div class="${"p-2 lg:w-1/3 md:w-1/2 w-full"}"><div class="${"h-full flex items-center border-gray-200 border p-4 rounded-lg"}"><img alt="${"team"}" class="${"w-16 h-16 bg-gray-100 object-cover object-center flex-shrink-0 rounded-full mr-4"}" src="${"https://dummyimage.com/104x94"}">
					<div class="${"flex-grow"}"><h2 class="${"text-gray-900 title-font font-medium"}">\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E14\u0E49\u0E32\u0E19</h2>
						<p class="${"text-gray-500"}">System</p></div></div></div>
			<div class="${"p-2 lg:w-1/3 md:w-1/2 w-full"}"><div class="${"h-full flex items-center border-gray-200 border p-4 rounded-lg"}"><img alt="${"team"}" class="${"w-16 h-16 bg-gray-100 object-cover object-center flex-shrink-0 rounded-full mr-4"}" src="${"https://dummyimage.com/108x98"}">
					<div class="${"flex-grow"}"><h2 class="${"text-gray-900 title-font font-medium"}">\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E14\u0E49\u0E32\u0E19</h2>
						<p class="${"text-gray-500"}">Product Manager</p></div></div></div></div></div></section>`;
});
var ranking = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: Ranking
});
var linklist = [
  {
    title: "\u0E01\u0E32\u0E23\u0E44\u0E1F\u0E1F\u0E49\u0E32\u0E2A\u0E48\u0E27\u0E19\u0E20\u0E39\u0E21\u0E34\u0E20\u0E32\u0E04",
    url: "www.pea.co.th",
    prefix: "\u0E01\u0E1F\u0E20.",
    user: "Worakrit Soontornthamniti",
    content: "some contnet"
  },
  {
    title: "\u0E2D\u0E34\u0E19\u0E17\u0E23\u0E32\u0E40\u0E19\u0E47\u0E15 \u0E01\u0E32\u0E23\u0E44\u0E1F\u0E1F\u0E49\u0E32\u0E2A\u0E48\u0E27\u0E19\u0E20\u0E39\u0E21\u0E34\u0E20\u0E32\u0E04",
    url: "http://intranet.pea.co.th",
    prefix: "\u0E01\u0E1F\u0E20.",
    user: "Worakrit Soontornthamniti"
  },
  {
    title: "\u0E2D\u0E34\u0E19\u0E17\u0E23\u0E32\u0E40\u0E19\u0E47\u0E15 \u0E01\u0E1F\u0E15.3",
    url: "http://intra.pea.co.th/peas3",
    prefix: "\u0E01\u0E1F\u0E15.3",
    user: "Worakrit Soontornthamniti"
  },
  {
    title: "\u0E01\u0E32\u0E23\u0E44\u0E1F\u0E1F\u0E49\u0E32\u0E42\u0E1B\u0E23\u0E48\u0E07\u0E43\u0E2A \u0E01\u0E1F\u0E15.3 \u0E1B\u0E23\u0E30\u0E08\u0E33\u0E1B\u0E35 2564",
    url: "http://strms.pea.co.th/s3/2564/tprS3-64/home.php",
    user: "Worakrit Soontornthamniti"
  },
  {
    title: "\u0E40\u0E27\u0E47\u0E1A\u0E44\u0E0B\u0E15\u0E4C \u0E2A\u0E33\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E2A\u0E35\u0E40\u0E02\u0E35\u0E22\u0E27 \u0E01\u0E1F\u0E15.3",
    url: "http://greenoffice.pea.co.th/2564/",
    user: "Worakrit Soontornthamniti"
  },
  {
    title: "\u0E40\u0E27\u0E47\u0E1A\u0E44\u0E0B\u0E15\u0E4C\u0E2A\u0E2B\u0E01\u0E23\u0E13\u0E4C\u0E2D\u0E2D\u0E21\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C \u0E01\u0E1F\u0E20.",
    url: "http://www.peacoop.or.th/",
    user: "Worakrit Soontornthamniti"
  },
  {
    title: "\u0E40\u0E27\u0E47\u0E1A\u0E44\u0E0B\u0E15\u0E4C\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E41\u0E1B\u0E25\u0E07\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19\u0E01\u0E32\u0E23\u0E25\u0E07\u0E17\u0E38\u0E19 MFCfund",
    url: "https://www.mfcfund.com",
    user: "Worakrit Soontornthamniti"
  },
  {
    title: "\u0E04\u0E25\u0E31\u0E07\u0E04\u0E27\u0E32\u0E21\u0E23\u0E39\u0E49 \u0E01\u0E1F\u0E15.3 youtube",
    url: "http://bct.pea.co.th/youtube/",
    user: "Worakrit Soontornthamniti"
  },
  {
    title: "\u0E23\u0E30\u0E1A\u0E1A\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E2B\u0E19\u0E35\u0E49\u0E04\u0E48\u0E32\u0E44\u0E1F\u0E1F\u0E49\u0E32\u0E04\u0E49\u0E32\u0E07\u0E0A\u0E33\u0E23\u0E30 ETSx",
    url: "http://c2intra.pea.co.th/c2/ETSx_C2",
    user: "Worakrit Soontornthamniti"
  },
  {
    title: "\u0E23\u0E30\u0E1A\u0E1A\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E1C\u0E25 \u0E01\u0E32\u0E23\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E15\u0E32\u0E21\u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E32\u0E22 OKR",
    url: "http://okr.pea.co.th/",
    user: "Worakrit Soontornthamniti"
  },
  {
    title: "Dashboard ",
    url: "https://sites.google.com/view/s3-pms/home",
    user: "Worakrit Soontornthamniti"
  },
  {
    title: "\u0E23\u0E30\u0E1A\u0E1A\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E1E\u0E31\u0E2A\u0E14\u0E38",
    url: "https://simp-peadashboard.web.app",
    user: "Worakrit Soontornthamniti"
  },
  {
    title: "\u0E40\u0E27\u0E47\u0E1A\u0E44\u0E0B\u0E15\u0E4C\u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E14\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E44\u0E1F\u0E1F\u0E49\u0E32\u0E23\u0E32\u0E22\u0E43\u0E2B\u0E0D\u0E48\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E21\u0E34\u0E40\u0E15\u0E2D\u0E23\u0E4C",
    url: "https://smr.pea.co.th",
    user: "Worakrit Soontornthamniti"
  },
  {
    title: "\u0E40\u0E27\u0E47\u0E1A\u0E44\u0E0B\u0E15\u0E4C\u0E25\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19/\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A \u0E01\u0E32\u0E23\u0E02\u0E2D\u0E04\u0E37\u0E19\u0E40\u0E07\u0E34\u0E19\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49",
    url: "http://cdp.pea.co.th/",
    user: "Worakrit Soontornthamniti"
  }
];
const LinkCard = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let {title} = $$props;
  let {url} = $$props;
  let {prefix = "\u0E0A\u0E37\u0E48\u0E2D\u0E22\u0E48\u0E2D"} = $$props;
  let {user} = $$props;
  let {content = "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E43\u0E19\u0E2A\u0E48\u0E27\u0E19\u0E02\u0E2D\u0E07\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E2B\u0E32\u0E41\u0E2A\u0E14\u0E07"} = $$props;
  let {owner = "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E43\u0E19\u0E2A\u0E48\u0E27\u0E19\u0E02\u0E2D\u0E07\u0E40\u0E08\u0E49\u0E32\u0E02\u0E2D\u0E07\u0E40\u0E27\u0E47\u0E1A"} = $$props;
  if ($$props.title === void 0 && $$bindings.title && title !== void 0)
    $$bindings.title(title);
  if ($$props.url === void 0 && $$bindings.url && url !== void 0)
    $$bindings.url(url);
  if ($$props.prefix === void 0 && $$bindings.prefix && prefix !== void 0)
    $$bindings.prefix(prefix);
  if ($$props.user === void 0 && $$bindings.user && user !== void 0)
    $$bindings.user(user);
  if ($$props.content === void 0 && $$bindings.content && content !== void 0)
    $$bindings.content(content);
  if ($$props.owner === void 0 && $$bindings.owner && owner !== void 0)
    $$bindings.owner(owner);
  return `<div class="${"max-w-md mx-auto m-6 bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl"}"><div class="${"md:flex"}"><div class="${"md:flex-shrink-0"}"><img class="${"h-48 w-full object-cover md:w-48"}" src="${"https://dummyimage.com/240"}" alt="${escape(prefix) + " logo "}"></div>
		<div class="${"p-8"}"><div class="${"uppercase tracking-wide text-sm text-indigo-500 font-semibold"}">${escape(title)}</div>
			<a${add_attribute("href", url, 0)} class="${"block mt-1 text-lg leading-tight font-medium text-black hover:underline"}">${escape(url)}</a>
			<p class="${"mt-2 text-gray-500"}">\u0E2D\u0E18\u0E34\u0E1A\u0E32\u0E22\u0E42\u0E14\u0E22\u0E22\u0E48\u0E2D: ${escape(content)}</p>
			<p>\u0E14\u0E39\u0E41\u0E25\u0E42\u0E14\u0E22: ${escape(owner)}</p>
			<p class="${"hidden lg:w-4"}">${escape(user)}</p></div></div></div>`;
});
var Box_svelte_svelte_type_style_lang = ".box.svelte-med1o8{border:1px solid #aaa;border-radius:2px;box-shadow:2px 2px 8px rgba(0,0,0,.1);margin:0 0 1em;padding:1em;width:300px}";
function finding() {
  return "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E2B\u0E32\u0E08\u0E32\u0E01\u0E40\u0E0B\u0E34\u0E1F\u0E40\u0E27\u0E2D\u0E23\u0E4C";
}
const Search = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let linkResult;
  let {textInputs = ""} = $$props;
  const fuse = new Fuse(linklist, {
    keys: ["name", "title", "url"],
    includeScore: true
  });
  if ($$props.textInputs === void 0 && $$bindings.textInputs && textInputs !== void 0)
    $$bindings.textInputs(textInputs);
  linkResult = fuse.search(textInputs);
  return `



<section><div class="${"flex justify-center my-5"}"><input class="${" text-center bg-purple-200 hover:bg-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-opacity-50 "}" type="${"search"}" placeholder="${"\u0E04\u0E49\u0E19\u0E2B\u0E32"}"${add_attribute("value", textInputs, 1)}>
		<button>\u0E04\u0E49\u0E19\u0E2B\u0E32\u{1F680} </button></div>

	${finding ? `<div class="${"grid"}"><ul>${each(linkResult, (link) => `

					${validate_component(LinkCard, "LinkCard").$$render($$result, Object.assign(link.item), {}, {})}
					`)}</ul></div>` : ``}
</section>`;
});
var index$3 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: Search
});
const browser = false;
const dev = false;
const hydrate = dev;
const router = browser;
const prerender = true;
const About = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `
${$$result.head += `${$$result.title = `<title>About</title>`, ""}`, ""}

<article class="${"text-2xl text-center my-40"}"><h1>\u0E04\u0E49\u0E19\u0E2B\u0E32 \u0E20\u0E32\u0E22\u0E43\u0E19</h1>
	\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E15\u0E48\u0E32\u0E07 \u0E46 \u0E17\u0E35\u0E48\u0E40\u0E15\u0E34\u0E21\u0E42\u0E15\u0E02\u0E36\u0E49\u0E19 \u0E40\u0E27\u0E47\u0E1A\u0E44\u0E0B\u0E14\u0E4C\u0E21\u0E32\u0E01\u0E02\u0E36\u0E49\u0E19 \u0E42\u0E1B\u0E23\u0E41\u0E01\u0E23\u0E21 \u0E21\u0E32\u0E01\u0E02\u0E36\u0E49\u0E19
	<h1>\u0E08\u0E36\u0E07\u0E17\u0E33\u0E02\u0E36\u0E49\u0E19\u0E21\u0E32\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E2B\u0E49\u0E0A\u0E48\u0E27\u0E22\u0E43\u0E19\u0E01\u0E32\u0E23\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E20\u0E32\u0E22\u0E43\u0E19 \u0E42\u0E14\u0E22\u0E43\u0E0A\u0E49\u0E01\u0E32\u0E23\u0E2B\u0E32\u0E41\u0E1A\u0E1A\u0E04\u0E25\u0E38\u0E21\u0E40\u0E04\u0E25\u0E37\u0E2D \u0E41\u0E25\u0E30\u0E2D\u0E34\u0E07\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48\u0E40\u0E01\u0E47\u0E1A
		\u0E40\u0E27\u0E47\u0E1A\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49 \u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E14\u0E39\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E15\u0E34\u0E21\u0E44\u0E14\u0E49
	</h1>

	\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07
	<a href="${"https://www.notion.so/"}">Pbox </a>
</article>`;
});
var about = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: About,
  hydrate,
  router,
  prerender
});
const Cardprofile = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<ion-card><ion-card-header><ion-card-subtitle></ion-card-subtitle>
		<ion-card-title>title</ion-card-title></ion-card-header>
	<ion-card-content ion-padding><ion-col></ion-col></ion-card-content>
	<ion-card-footer><ion-button fill="${"clear"}"><ion-icon slot="${"icon-only"}" ios="${"heart"}" md="${"heart-sharp"}"></ion-icon></ion-button>
		<ion-button fill="${"clear"}"><ion-icon slot="${"icon-only"}" ios="${"share"}" md="${"share-sharp"}"></ion-icon></ion-button>
		<ion-chip><ion-avatar><img alt="${"avatar"}" src="${"/"}"></ion-avatar>
			<ion-label>Avatar</ion-label></ion-chip></ion-card-footer></ion-card>`;
});
var cardprofile = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: Cardprofile
});
const Login = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<ion-header translucent="${"Name"}"><ion-toolbar><ion-buttons slot="${"start"}"><ion-menu-button></ion-menu-button></ion-buttons>
		<ion-title>Login</ion-title></ion-toolbar></ion-header>
<ion-content fullscreen class="${"ion-padding"}"><ion-item><ion-label color="${"primary"}" position="${"floating"}">Email</ion-label>
		<ion-input required type="${"email"}" name="${"email"}"></ion-input></ion-item>
	<ion-item><ion-label color="${"primary"}" position="${"floating"}">Password</ion-label>
		<ion-input required type="${"password"}" name="${"password"}"></ion-input></ion-item>
	<ion-button type="${"submit"}" expand="${"block"}">Log in</ion-button>
	<ion-button type="${"button"}" expand="${"block"}" color="${"light"}">Not yet a member? Sign up! </ion-button>

	<ion-button type="${"button"}" expand="${"block"}" color="${"tertiary"}"><ion-icon name="${"logo-google"}" slot="${"start"}"></ion-icon>
		Sign in with Google
	</ion-button>
	<ion-button type="${"button"}" expand="${"block"}" color="${"tertiary"}"><ion-icon name="${"logo-apple"}" slot="${"start"}"></ion-icon>
		Sign in with Apple
	</ion-button>
</ion-content>`;
});
var Login$1 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: Login
});
function cubicOut(t) {
  const f = t - 1;
  return f * f * f + 1;
}
function quintOut(t) {
  return --t * t * t * t * t + 1;
}
/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
function __rest(s2, e) {
  var t = {};
  for (var p in s2)
    if (Object.prototype.hasOwnProperty.call(s2, p) && e.indexOf(p) < 0)
      t[p] = s2[p];
  if (s2 != null && typeof Object.getOwnPropertySymbols === "function")
    for (var i = 0, p = Object.getOwnPropertySymbols(s2); i < p.length; i++) {
      if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s2, p[i]))
        t[p[i]] = s2[p[i]];
    }
  return t;
}
function crossfade(_a) {
  var {fallback} = _a, defaults = __rest(_a, ["fallback"]);
  const to_receive = new Map();
  const to_send = new Map();
  function crossfade2(from, node, params) {
    const {delay = 0, duration = (d3) => Math.sqrt(d3) * 30, easing = cubicOut} = assign(assign({}, defaults), params);
    const to = node.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    const dw = from.width / to.width;
    const dh = from.height / to.height;
    const d2 = Math.sqrt(dx * dx + dy * dy);
    const style = getComputedStyle(node);
    const transform = style.transform === "none" ? "" : style.transform;
    const opacity = +style.opacity;
    return {
      delay,
      duration: is_function(duration) ? duration(d2) : duration,
      easing,
      css: (t, u) => `
				opacity: ${t * opacity};
				transform-origin: top left;
				transform: ${transform} translate(${u * dx}px,${u * dy}px) scale(${t + (1 - t) * dw}, ${t + (1 - t) * dh});
			`
    };
  }
  function transition(items, counterparts, intro) {
    return (node, params) => {
      items.set(params.key, {
        rect: node.getBoundingClientRect()
      });
      return () => {
        if (counterparts.has(params.key)) {
          const {rect} = counterparts.get(params.key);
          counterparts.delete(params.key);
          return crossfade2(rect, node, params);
        }
        items.delete(params.key);
        return fallback && fallback(node, params, intro);
      };
    };
  }
  return [
    transition(to_send, to_receive, false),
    transition(to_receive, to_send, true)
  ];
}
var index_svelte_svelte_type_style_lang = `.todos.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{line-height:1;margin:var(--column-margin-top) auto 0 auto;max-width:var(--column-width);width:100%}.new.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{margin:0 0 .5rem}input.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{border:1px solid transparent}input.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf:focus-visible{border:1px solid violet!important;box-shadow:inset 1px 1px 6px rgba(0,0,0,.1);outline:none}.new.svelte-13wdnuf input.svelte-13wdnuf.svelte-13wdnuf{background:hsla(0,0%,100%,.05);box-sizing:border-box;font-size:28px;padding:.5em 1em .3em;text-align:center;width:100%}.new.svelte-13wdnuf input.svelte-13wdnuf.svelte-13wdnuf,.todo.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{border-radius:8px}.todo.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{grid-gap:.5rem;align-items:center;background-color:#fff;display:grid;filter:drop-shadow(2px 4px 6px rgba(0,0,0,.1));grid-template-columns:2rem 1fr 2rem;margin:0 0 .5rem;padding:.5rem;transform:translate(-1px,-1px);transition:filter .2s,transform .2s}.done.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{filter:drop-shadow(0 0 1px rgba(0,0,0,.1));opacity:.4;transform:none}form.text.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{align-items:center;display:flex;flex:1;position:relative}.todo.svelte-13wdnuf input.svelte-13wdnuf.svelte-13wdnuf{border-radius:3px;flex:1;padding:.5em 2em .5em .8em}.todo.svelte-13wdnuf button.svelte-13wdnuf.svelte-13wdnuf{background-color:transparent;background-position:50% 50%;background-repeat:no-repeat;border:none;height:2em;width:2em}button.toggle.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{background-size:1em auto;border:1px solid rgba(0,0,0,.2);border-radius:50%;box-sizing:border-box}.done.svelte-13wdnuf .toggle.svelte-13wdnuf.svelte-13wdnuf{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg width='22' height='16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='m20.5 1.5-13.063 13L1.5 8.59' stroke='%23676778' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")}.delete.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg width='24' height='24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4.5 5v17h15V5h-15z' fill='%23676778' stroke='%23676778' stroke-width='1.5' stroke-linejoin='round'/%3E%3Cpath d='M10 10v6.5m4-6.5v6.5' stroke='%23fff' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M2 5h20' stroke='%23676778' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='m8 5 1.645-3h4.744L16 5H8z' fill='%23676778' stroke='%23676778' stroke-width='1.5' stroke-linejoin='round'/%3E%3C/svg%3E");opacity:.2}.delete.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf:hover{opacity:1;transition:opacity .2s}.save.svelte-13wdnuf.svelte-13wdnuf.svelte-13wdnuf{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg width='24' height='24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2z' fill='%23676778' stroke='%23676778' stroke-width='1.5' stroke-linejoin='round'/%3E%3Cpath d='M17 2v9H7.5V2H17z' fill='%23fff' stroke='%23fff' stroke-width='1.5' stroke-linejoin='round'/%3E%3Cpath d='M13.5 5.5v2M5.998 2H18.5' stroke='%23676778' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");opacity:0;position:absolute;right:0}.todo.svelte-13wdnuf input.svelte-13wdnuf:focus+.save.svelte-13wdnuf{opacity:1;transition:opacity .2s}`;
const css$1 = {
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
  $$result.css.add(css$1);
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
var index$2 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: Todos,
  load
});
const User = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div class="${"p-2 lg:w-1/3 md:w-1/2 w-full"}"><div class="${"h-full flex items-center border-gray-200 border p-4 rounded-lg"}"><img alt="${"team"}" class="${"w-16 h-16 bg-gray-100 object-cover object-center flex-shrink-0 rounded-full mr-4"}" src="${"https://dummyimage.com/80x80"}">
		<div class="${"flex-grow"}"><h2 class="${"text-gray-900 title-font font-medium"}">Holden Caulfield</h2>
			<p class="${"text-gray-500"}">UI Designer</p></div></div></div>`;
});
var User$1 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: User
});
const News = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<ion-header>\u0E02\u0E48\u0E32\u0E27\u0E2D\u0E31\u0E1E\u0E40\u0E14\u0E17 </ion-header>`;
});
var index$1 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: News
});
var summary_svelte_svelte_type_style_lang = "article.svelte-12xk5z5{border-bottom:1px solid #eee;padding:0 0 0 2em;position:relative}h2.svelte-12xk5z5{font-size:1em;margin:.5em 0}span.svelte-12xk5z5{left:0;position:absolute}a.svelte-12xk5z5{color:#333}";
const css = {
  code: "article.svelte-12xk5z5{border-bottom:1px solid #eee;padding:0 0 0 2em;position:relative}h2.svelte-12xk5z5{font-size:1em;margin:.5em 0}span.svelte-12xk5z5{left:0;position:absolute}a.svelte-12xk5z5{color:#333}",
  map: '{"version":3,"file":"summary.svelte","sources":["summary.svelte"],"sourcesContent":["<script>\\n\\texport let item;\\n\\texport let i;\\n\\texport let offset;\\n\\n\\tfunction comment_text() {\\n\\t\\tconst c = item.comments_count;\\n\\t\\treturn `${c} ${c === 1 ? \'comment\' : \'comments\'}`;\\n\\t}\\n\\n\\t$: url = item.type === \'ask\' ? `https://news.ycombinator.com/${item.url}` : item.url;\\n</script>\\n\\n<article>\\n\\t<span>{i + offset + 1}</span>\\n\\t<h2><a target=\\"_blank\\" href={url}>{item.title}</a></h2>\\n\\t<p class=\\"meta\\"><a href=\\"#/item/{item.id}\\">{comment_text()}</a> by {item.user} {item.time_ago}</p>\\n</article>\\n\\n<style>article{border-bottom:1px solid #eee;padding:0 0 0 2em;position:relative}h2{font-size:1em;margin:.5em 0}span{left:0;position:absolute}a{color:#333}</style>\\n"],"names":[],"mappings":"AAmBO,sBAAO,CAAC,cAAc,GAAG,CAAC,KAAK,CAAC,IAAI,CAAC,QAAQ,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,SAAS,QAAQ,CAAC,iBAAE,CAAC,UAAU,GAAG,CAAC,OAAO,IAAI,CAAC,CAAC,CAAC,mBAAI,CAAC,KAAK,CAAC,CAAC,SAAS,QAAQ,CAAC,gBAAC,CAAC,MAAM,IAAI,CAAC"}'
};
const Summary = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let url;
  let {item} = $$props;
  let {i} = $$props;
  let {offset} = $$props;
  function comment_text() {
    const c = item.comments_count;
    return `${c} ${c === 1 ? "comment" : "comments"}`;
  }
  if ($$props.item === void 0 && $$bindings.item && item !== void 0)
    $$bindings.item(item);
  if ($$props.i === void 0 && $$bindings.i && i !== void 0)
    $$bindings.i(i);
  if ($$props.offset === void 0 && $$bindings.offset && offset !== void 0)
    $$bindings.offset(offset);
  $$result.css.add(css);
  url = item.type === "ask" ? `https://news.ycombinator.com/${item.url}` : item.url;
  return `<article class="${"svelte-12xk5z5"}"><span class="${"svelte-12xk5z5"}">${escape(i + offset + 1)}</span>
	<h2 class="${"svelte-12xk5z5"}"><a target="${"_blank"}"${add_attribute("href", url, 0)} class="${"svelte-12xk5z5"}">${escape(item.title)}</a></h2>
	<p class="${"meta"}"><a href="${"#/item/" + escape(item.id)}" class="${"svelte-12xk5z5"}">${escape(comment_text())}</a> by ${escape(item.user)} ${escape(item.time_ago)}</p>
</article>`;
});
var summary = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: Summary
});
var Modal_svelte_svelte_type_style_lang = ".modal-background.svelte-1nmqybx{background:rgba(0,0,0,.3);height:100%;left:0;position:fixed;top:0;width:100%}.modal.svelte-1nmqybx{background:#fff;border-radius:.2em;left:50%;max-height:calc(100vh - 4em);max-width:32em;overflow:auto;padding:1em;position:absolute;top:50%;transform:translate(-50%,-50%);width:calc(100vw - 4em)}button.svelte-1nmqybx{display:block}";
const Box_1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  crossfade({
    fallback(node, params) {
      const style = getComputedStyle(node);
      const transform = style.transform === "none" ? "" : style.transform;
      return {
        duration: 400,
        easing: quintOut,
        css: (t) => `
					transform: ${transform} scale(${t});
					opacity: ${t}
				`
      };
    }
  });
  return `<ion-button color="${"pea"}">\u0E40\u0E1E\u0E34\u0E48\u0E21</ion-button>

${``}`;
});
var index = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: Box_1
});
export {init, render};
