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

![Demo](https://gateway.ipfs.io/ipfs/Qmf34RLAUjcZBPFFz2CpkwENcqq92GdUbvg4ZeF1ibeQ7p/sketch-control-vs-test-sample.gif)

The mini-screencast above shows 2 simultaneous simulations - a control sample
(with the shipping version of peer-base) and a test sample (with a version of
peer-base from the master branch on github). Each simulation does the follow
steps (synchronized):

1. starts a [libp2p peer-star rendezvous server](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous) on an unused port
2. starts 8 subprocesses, "Peer A" to "Peer H", each of which creates a peer-base collaboration (using a replicatable grow array,
   as used in [PeerPad](https://peerpad.net/) 
3. "Peer A" types "aAaA" (pause 1 second) "aAaA"
4. "Peer B" types "bBbB" (pause 1 second) "bBbB"
5. and so on...
6. "Peer H" types "hHhH" (pause 1 second) "hHhH"

In this particular experiment, there wasn't a noticeable difference between the
shipping version and the version in git.

# License

MIT
