const anchor = require("@project-serum/anchor");
const assert = require("assert");
const fs = require("fs");
const {PublicKey} = require("@solana/web3.js");
const { getMint} = require("./helper");


anchor.setProvider(anchor.Provider.local("https://api.devnet.solana.com"));
const idl = JSON.parse(
    require('fs')
        .readFileSync('target/idl/contracts.json', 'utf8')
        .toString());
const programId = new anchor.web3.PublicKey("GWzBR7znXxEVDkDVgQQu5Vpzu3a5G4e5kPXaE9MvebY2");
const provider = anchor.getProvider();
const program = new anchor.Program(idl, programId, provider);
const SNS = new anchor.web3.PublicKey("51LAPRbcEvheteGQjSgAFV6rrEvjL4P2igvzPH8bu88");
let sns = null;

const ks_hadi = fs.readFileSync("/home/hadi/.config/solana/id.json", {encoding: 'utf8'});
const kb_hadi = Buffer.from(JSON.parse(ks_hadi));
let hadi = new anchor.web3.Account(kb_hadi);
console.log("\tLoad user hadi: ", hadi.publicKey.toBase58());

describe('contracts', () => {
    const user = anchor.web3.Keypair.generate();
    it("Creates an associated account", async () => {
        const amount = new anchor.BN(10) ;
        const period = new anchor.BN(7) ;
        const campaign_ref = "zx-1" ;
        const  transaction =  await program.rpc.initialize(amount,period,campaign_ref,{
            accounts: {
                ontology: user.publicKey,
                architect: hadi.publicKey,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [user, hadi],
            instructions: [
                await program.account.ontology.createInstruction(user),
            ],
        });
        const ontology = await program.account.ontology.fetch(user.publicKey);
        assert.ok(
            JSON.stringify(ontology.architect.toBuffer()) ===
            JSON.stringify(program.provider.wallet.publicKey.toBuffer())
        );

    }).timeout(10000);
});
