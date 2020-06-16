const _sendMessage = async m => {
  const res = await fetch(`https://g7osq5qtn9.execute-api.us-west-1.amazonaws.com/production?t=postMessage`, {
    method: 'POST',
    body: m,
  });
  return await res.text();
};
const _sendAttachment = async url => {
  const res = await fetch(`https://g7osq5qtn9.execute-api.us-west-1.amazonaws.com/production?t=postAttachment`, {
    method: 'POST',
    body: url,
  });
  return await res.text();
};
var isAddress = function (address) {
  return /^(0x)?[0-9a-f]{40}$/i.test(address);
};

const handlers = {
  'test': async (userId, args, attachments) => {
     return await _sendMessage('got args: ' + JSON.stringify(args));
  },
  'name': async (userId, args, attachments) => {
    const n = args.length >= 1 ? parseInt(args[0], 10) : NaN;
    if (!isNaN(n)) {
      const res = await fetch(`https://jx8j0cgqul.execute-api.us-west-1.amazonaws.com/production/${n}`);
      if (res.ok) {
        const j = await res.json();
        const {name} = j;
        return await _sendMessage(`Token #${n}: \`${name}\``);
      } else {
        return await _sendMessage(`not found: ${n}`);
      }
    } else {
      return '';
    }
  },
  'screenshot': async (userId, args, attachments) => {
    const n = args.length >= 1 ? parseInt(args[0], 10) : NaN;
    if (!isNaN(n)) {
      const res = await fetch(`https://jx8j0cgqul.execute-api.us-west-1.amazonaws.com/production/${n}`);
      if (res.ok) {
        const j = await res.json();
        const {attributes} = j;
        const {screenshotUrl} = attributes;
        return await _sendAttachment(screenshotUrl);
      } else {
        return await _sendMessage(`not found: ${n} ${res.status}`);
      }
    } else {
      return '';
    }
  },
  'setAddress': async (userId, args, attachments) => {
    if (args.length >= 1) {
      const address = args[0];
      if (isAddress(address)) {
        await discordKv.put(userId, address);
        return await _sendMessage(`address changed: \`${address}\``);
      } else {
        return await _sendMessage(`invalid address: \`${address}\``);
      }
    } else {
      return '';
    }
  },
  'removeAddress': async (userId, args, attachments) => {
    await discordKv.delete(userId);
    return await _sendMessage(`address removed`);
  },
  'address': async (userId, args, attachments) => {
    // console.log('get address', userId);
    const address = await discordKv.get(userId);
    if (address) {
      return await _sendMessage(`address found: \`${address}\``);
    } else {
      return await _sendMessage(`address not found`);
    }
  },
  'inventory': async (userId, args, attachments) => {
    const address = await discordKv.get(userId);
    if (address) {
      // const address = args[0];
      const proxyRes = await fetch(`https://jx8j0cgqul.execute-api.us-west-1.amazonaws.com/production/i/${address}`);
      const j = await proxyRes.json();
      return await _sendMessage(`\`\`\`${j.map(o => `#${o.id}: ${o.name}`).join('\n')}\`\`\``);
    } else {
      return '';
    }
  },
  'opensea': async (userId, args, attachments) => {
    const n = args.length >= 1 ? parseInt(args[0], 10) : NaN;
    if (!isNaN(n)) {
      const contractAddress = await fetch(`https://cryptopolys.com/address.js`).then(res => res.text()).then(s => s.replace(/^export default `(.+?)`[\s\S]*$/, '$1'));
      const u = `https://rinkeby.opensea.io/assets/${contractAddress}/${n}`;
      return await _sendMessage(`Token #${n}: ${u}`);
    } else {
      return '';
    }
  },
};

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
});
async function handleRequest(request) {
  const {method} = request;
  const {pathname} = new URL(request.url);
  if (method === 'POST' && pathname === '/message') {
    const j = await request.json();
    console.log('handle', j);
    //const s = await _sendMessage('got message: ' + JSON.stringify(j));
    const {userId, content, attachments} = j;
    /* for (let i = 0; i < attachments.length; i++) {
      const {name, url} = attachments[i];
      await _sendAttachment(url);
    } */

    const match = content.match(/^!(\S+)/);
    const method = match && match[1];
    const handler = handlers[method];
    let result;
    if (handler) {
      const args = content.split(/\s+/).slice(1);
      result = await handler(userId, args, attachments);
    } else {
      result = 'no such method';
    }
 
    return new Response(result);
  } else {
    return new Response('not found', {
      status: 404,
    });
  }
}
