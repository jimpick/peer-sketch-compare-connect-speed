# peer-sketch-compare-connect-speed

Comparing two versions of peer-pad

# Usage

```
npm install
(cd control-sample; npm install)
(cd test-sample; npm install)
npm start 2> /dev/null
```

# Demo

![Demo](https://gateway.ipfs.io/ipfs/QmTWesBSdAqd7XHNWieHuGivaAT2KrshZ2eCfepC9ov4GA/sketch-control-vs-test-sample-data-first.gif)

The mini-screencast above shows 2 simultaneous simulations - a control sample
(with the shipping version of peer-base) and a test sample (with a version of
peer-base from the master branch on github). Each simulation does the follow
steps (synchronized):

1. starts a [libp2p peer-star rendezvous server](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous) on an unused port
2. starts a subprocesses, "Peer A", which creates a peer-base collaboration (using a replicatable grow array,
   as used in [PeerPad](https://peerpad.net/) 
3. "Peer A" types "aAaA" (pause 1 second) "aAaA"
4. starts another subprocess, "Peer B"
5. "Peer B" types "bBbB" (pause 1 second) "bBbB"
6. and so on...
7. starts another subprocess, "Peer H"
8. "Peer H" types "hHhH" (pause 1 second) "hHhH"

In this particular experiment, there wasn't a noticeable difference between the
shipping version and the version in git.

# License

MIT
