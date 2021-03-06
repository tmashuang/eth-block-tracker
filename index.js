// const EthQuery = require('ethjs-query')
const EthQuery = require('eth-query')
const AsyncEventEmitter = require('async-eventemitter')
const pify = require('pify')
const incrementHexNumber = require('./lib/hexUtils').incrementHexNumber

class RpcBlockTracker extends AsyncEventEmitter {

  constructor(opts = {}) {
    super()
    if (!opts.provider) throw new Error('RpcBlockTracker - no provider specified.')
    this._query = new EthQuery(opts.provider)
    // config
    this._pollingInterval = opts.pollingInterval || 800
    // state
    this._trackingBlock = null
    this._currentBlock = null
    this._isRunning = false
    // bind methods for cleaner syntax later
    this.emit = this.emit.bind(this)
    this._performSync = this._performSync.bind(this)
  }

  getTrackingBlock () {
    return this._trackingBlock
  }

  getCurrentBlock () {
    return this._currentBlock
  }

  async start (opts = {}) {
    // abort if already started
    if (this._isRunning) return
    this._isRunning = true
    // if this._currentBlock
    if (opts.fromBlock) {
      // use specified start point
      await this._setTrackingBlock(await this._fetchBlockByNumber(opts.fromBlock))
    } else {
      // or query for latest
      await this._setTrackingBlock(await this._fetchLatestBlock())
    }
    this._performSync()
    .catch((err) => {
      if (err) console.error(err)
    })
  }

  stop () {
    this._isRunning = false
  }

  //
  // private
  //

  async _setTrackingBlock (newBlock) {
    if (this._trackingBlock && (this._trackingBlock.hash === newBlock.hash)) return
    this._trackingBlock = newBlock
    await pify(this.emit)('block', newBlock)
  }

  async _setCurrentBlock (newBlock) {
    if (this._currentBlock && (this._currentBlock.hash === newBlock.hash)) return
    this._currentBlock = newBlock
    await pify(this.emit)('latest', newBlock)
  }

  async _pollForNextBlock () {
    setTimeout(() => this._performSync(), this._pollingInterval)
  }

  async _performSync () {
    if (!this._isRunning) return
    const trackingBlock = this.getTrackingBlock()
    if (!trackingBlock) throw new Error('RpcBlockTracker - tracking block is missing')
    const nextNumber = incrementHexNumber(trackingBlock.number)
    try {
      
      const newBlock = await this._fetchBlockByNumber(nextNumber)
      if (newBlock) {
        // set as new tracking block
        await this._setTrackingBlock(newBlock)
        // ask for next block
        this._performSync()
      } else {
        // set tracking block as current block
        await this._setCurrentBlock(trackingBlock)
        // setup poll for next block
        this._pollForNextBlock()
      }

    } catch (err) {
      
      // hotfix for https://github.com/ethereumjs/testrpc/issues/290
      if (err.message.includes('index out of range') ||
          err.message.includes("Couldn't find block by reference")) {
        // set tracking block as current block
        await this._setCurrentBlock(trackingBlock)
        // setup poll for next block
        this._pollForNextBlock()
      } else {
        console.error(err)
      }

    }
  }

  _fetchLatestBlock () {
    return pify(this._query.getBlockByNumber).call(this._query, 'latest', false)
  }

  _fetchBlockByNumber (hexNumber) {
    return pify(this._query.getBlockByNumber).call(this._query, hexNumber, false)
  }

}

module.exports = RpcBlockTracker

 // ├─ difficulty: 0x2892ddca
 // ├─ extraData: 0xd983010507846765746887676f312e372e348777696e646f7773
 // ├─ gasLimit: 0x47e7c4
 // ├─ gasUsed: 0x6384
 // ├─ hash: 0xf60903687b1559b9c80f2d935b4c4f468ad95c3076928c432ec34f2ef3d4eec9
 // ├─ logsBloom: 0x00000000000000000000000000000000000000000000000000000000000020000000000000000000000000040000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000
 // ├─ miner: 0x01711853335f857442ef6f349b2467c531731318
 // ├─ mixHash: 0xf0d9bec999600eec92e8e4da8fc1182e357468c9ed2f849aa17e0e900412b352
 // ├─ nonce: 0xd556d5a5504198e4
 // ├─ number: 0x72ac8
 // ├─ parentHash: 0xf5239c3ce1085194521435a5052494c02bbb1002b019684dcf368490ea6208e5
 // ├─ receiptsRoot: 0x78c6f8236094b392bcc43b47b0dc1ce93ecd2875bfb5e4e4c3431e5af698ff99
 // ├─ sha3Uncles: 0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347
 // ├─ size: 0x2ad
 // ├─ stateRoot: 0x0554f145c481df2fa02ecd2da17071672740c3aa948c896f1465e6772f741ac6
 // ├─ timestamp: 0x58955844
 // ├─ totalDifficulty: 0x751d0dfa03c1
 // ├─ transactions
 // │  └─ 0
 // │     ├─ blockHash: 0xf60903687b1559b9c80f2d935b4c4f468ad95c3076928c432ec34f2ef3d4eec9
 // │     ├─ blockNumber: 0x72ac8
 // │     ├─ from: 0x201354729f8d0f8b64e9a0c353c672c6a66b3857
 // │     ├─ gas: 0x15f90
 // │     ├─ gasPrice: 0x4a817c800
 // │     ├─ hash: 0xd5a15d7c2449150db4f74f42a6ca0702150a24c46c5b406a7e1b3e44908ef44d
 // │     ├─ input: 0xe1fa8e849bc10d87fb03c6b0603b05a3e29043c7e0b7c927119576a4bec457e96c7d7cde
 // │     ├─ nonce: 0x323e
 // │     ├─ to: 0xd10e3be2bc8f959bc8c41cf65f60de721cf89adf
 // │     ├─ transactionIndex: 0x0
 // │     ├─ value: 0x0
 // │     ├─ v: 0x29
 // │     ├─ r: 0xf35f8ab241e6bb3ccaffd21b268dbfc7fcb5df1c1fb83ee5306207e4a1a3e954
 // │     └─ s: 0x1610cdac2782c91065fd43584cd8974f7f3b4e6d46a2aafe7b101788285bf3f2
 // ├─ transactionsRoot: 0xb090c32d840dec1e9752719f21bbae4a73e58333aecb89bc3b8ed559fb2712a3
 // └─ uncles
