require('events').EventEmitter.prototype._maxListeners = 100

const { fork, spawn } = require('child_process')
const diffy = require('diffy')
const trim = require('diffy/trim')
const diffyInput = require('diffy/input')

const { Machine, actions } = require('xstate')
const { interpret } = require('xstate/lib/interpreter')
const { assign } = actions

const getPort = require('get-port')

const { copyFileSync } = require('fs')

copyFileSync('./child.js', './control-sample/child.js')
copyFileSync('./child.js', './test-sample/child.js')

const rendezvousPorts = []
const numPeers = 8
const peers = []

const peerStates = {}

const aCharCode = 'a'.charCodeAt(0) // 97
for (let i = 0; i < numPeers; i++) {
  for (let j = 1; j <= 2; j++) { // 1 = control sample, 2 = test sample
    const peerLabel = String.fromCharCode(aCharCode + i) + j
    const peerLabelUpper = peerLabel.toUpperCase()
    const prevPeerLabel = String.fromCharCode(aCharCode + i - 1) + j
    const prevPeerLabelUpper = prevPeerLabel.toUpperCase()
    const lastPeerLabel = String.fromCharCode(aCharCode + numPeers - 1) + j
    const lastPeerLabelUpper = lastPeerLabel.toUpperCase()
    const waitingState = (i !== numPeers - 1)
      ? 'waiting for last'
      : 'last peer ready'
    peerStates[`peer${peerLabelUpper}`] = {
      initial: 'not started',
      states: {
        'not started': {
          on: {
            NEXT: {
              target: 'starting',
              cond: ctx => !i || ctx[`ready${prevPeerLabelUpper}`]
            }
          }  
        },
        starting: {
          onEntry: () => { peers[peerLabel] = startPeer(peerLabel) },
          on: {
            NEXT: { actions: () => { peers[peerLabel].send('NEXT') } },
            [`PEER ${peerLabelUpper}:COLLABORATION CREATED`]: waitingState
          }
        },
        'waiting for last': {
          onEntry: assign({[`ready${peerLabelUpper}`]: true}),
          on: {
            [`PEER ${lastPeerLabelUpper}:COLLABORATION CREATED`]: 'paused'
          }
        },
        'last peer ready': {
          onEntry: assign({[`ready${peerLabelUpper}`]: true}),
          on: {
            '': 'paused'
          }
        },
        paused: {
          on: {
            NEXT: {
              target: 'editing',
              cond: ctx => !i || ctx[`edited${prevPeerLabelUpper}`]
            }
          }
        },
        editing: {
          onEntry: () => { peers[peerLabel].send('NEXT') },
          on: {
            [`PEER ${peerLabelUpper}:DONE`]: 'done'
          }
        },
        done: {
          onEntry: assign({[`edited${peerLabelUpper}`]: true}),
          type: 'final'
        }
      }
    }
  }
}

const machine = Machine({
  id: 'top',
  initial: 'initial',
  context: {},
  states: {
    initial: {
      on: {
        NEXT: 'starting rendezvous'
      }
    },
    'starting rendezvous': {
      invoke: {
        id: 'startRendezvous',
        src: startRendezvous,
        onDone: 'rendezvous started',
        onError: 'failed'
      }
    },
    'rendezvous started': {
      on: {
        NEXT: 'peers'
      }
    },
    'peers': {
      id: 'peers',
      type: 'parallel',
      states: peerStates
    },
    done: {
      type: 'final'
    },
    failed: {
      type: 'final'
    }
  }
})

let state = ''
const log = []
const uiPeerStates = {}
for (let i = 0; i < numPeers; i++) {
  for (let j = 1; j <= 2; j++) {
    const peerLabel = String.fromCharCode(aCharCode + i) + j
    uiPeerStates[peerLabel] = { step: '', crdtValue: '' }
  }
}

const d = diffy({fullscreen: true})

d.render(
  () => {
    let text = `State: ${state.slice(0, d.width - 8)}\n\n`

    for (let j = 1; j <= 2; j++) {
      text += j === 1
        ? 'Control Sample (peer-base 0.11.1):\n'
        : '\nTest Sample (git peer-base/peer-base#master):\n'
      for (let i = 0; i < numPeers; i++) {
        const peerLabel = String.fromCharCode(aCharCode + i) + j
        const peerLabelUpper = peerLabel.toUpperCase()
        text += `  ${peerLabelUpper}: ` +
          `Step: ${uiPeerStates[peerLabel].step.slice(0, 22).padEnd(22)}  ` +
          `Value: ${uiPeerStates[peerLabel].crdtValue}\n`
      }
    }

    text += `\nLogs:\n` + log.slice(-(d.height - 8 - numPeers * 2)).join('\n')
    return text
  }
)

const input = diffyInput({showCursor: false})

const service = interpret(machine)
  .onTransition(nextState => {
    state = JSON.stringify(nextState.value)
    d.render()
  })
service.start()

input.on('keypress', (ch, key) => {
  switch (key.sequence) {
    case ' ':
      service.send('NEXT')
      break
    case 'q':
      process.exit(0)
      break
  }
})

async function startRendezvous () {
  for (let j = 1; j <= 2; j++) {
    const port = await getPort()
    log.push(`RV${j}: Starting rendezvous server on port ${port}`)
    rendezvousPorts[j] = port
    const child = spawn('npx', ['rendezvous', '-p', `${port}`])
    child.stdout.on('data', appendToLog)
    child.stderr.on('data', appendToLog)
    process.on('exit', () => child.kill())

    function appendToLog (chunk) {
      chunkToWidth(chunk.toString()).forEach(line => {
        log.push(`RV${j}: ${line}`)
      })
      d.render()
    }
  }
}

function startPeer (peerLabel) {
  const peerLabelUpper = peerLabel.toUpperCase()
  sampleDir = peerLabel.match(/1$/) ? 'control-sample' : 'test-sample'
  const child = fork(`${__dirname}/${sampleDir}/child.js`, {
    cwd: `${__dirname}/${sampleDir}`,
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    env: {
      ...process.env,
      PEER_LABEL: peerLabel,
      RENDEZVOUS_PORT: rendezvousPorts[peerLabel.slice(-1)]
    }
  })

  child.on('message', message => {
    if (message.stateMachine) {
      uiPeerStates[peerLabel].step = message.stateMachine
      service.send(
        `PEER ${peerLabelUpper}:` +
        `${message.stateMachine.toUpperCase()}`
      )
    }
    if (message.crdtValue) {
      uiPeerStates[peerLabel].crdtValue = message.crdtValue
    }
    d.render()
  })

  function appendToLog (chunk) {
    chunkToWidth(chunk.toString().replace(/\s+$/, '')).forEach(line => {
      log.push(`${peerLabelUpper}: ${line}`)
    })
    d.render()
  }
  child.stdout.on('data', appendToLog)
  child.stderr.on('data', appendToLog)

  process.on('exit', () => child.kill())
  return child
}

function appendToLog (msg) {
  chunkToWidth(msg).forEach(line => {
    log.push(`RV: ${line}`)
  })
  d.render()
}

function chunkToWidth (chunk) {
  return chunkString(chunk, d.width - 5)
}

function chunkString(str, length) {
  return str.match(new RegExp('.{1,' + length + '}', 'g'));
}
