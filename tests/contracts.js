const anchor = require('@project-serum/anchor');
const assert = require("assert");
const fs = require("fs");

anchor.setProvider(anchor.Provider.local("https://api.devnet.solana.com"));
const idl = JSON.parse(
    require('fs')
        .readFileSync('target/idl/contracts.json', 'utf8')
        .toString());
const programId = new anchor.web3.PublicKey(idl.metadata.address);
const provider = anchor.getProvider();
const program = new anchor.Program(idl, programId, provider);

describe('contracts', () => {
  it('Is initialized!', async () => {
    let user = anchor.web3.Keypair.generate();
    const tx = await program.rpc.initialize({accounts: {
        myOntology: provider.wallet.publicKey,
        user : provider.wallet.publicKey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
    }});
    console.log("\tYour transaction signature:\n\t", tx);
    assert.ok(true);
  }).timeout(7000);;
});
