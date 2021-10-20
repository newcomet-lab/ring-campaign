const userCharge = async (mint, owner, authority) => {
    const tokenAccount = await mint.getOrCreateAssociatedAccountInfo(owner.publicKey);
    await mint.mintTo(
        tokenAccount.address,
        authority,
        [],
        1000_000_000_000 // 1 followed by decimals number of 0s // You'll ask the creator ki how many decimals he wants in his token. If he says 4, then 1 token will be represented as 10000
    );
    const account = await mint.getOrCreateAssociatedAccountInfo(owner.publicKey);
    return account
};
const vaultCharge = async (mint, owner, authority) => {
    const tokenAccount = await mint.getOrCreateAssociatedAccountInfo(owner.publicKey);
    await mint.mintTo(
        tokenAccount.address,
        authority,
        [],
        1000_000_000_000_000
    );
    const account = await mint.getOrCreateAssociatedAccountInfo(owner.publicKey);
    return account
};

const ourCharge = async (mint, owner, authority) => {
    const tokenAccount = await mint.getOrCreateAssociatedAccountInfo(owner);
    await mint.mintTo(
        tokenAccount.address,
        authority,
        [],
        1000_000_000_000
    );
    const account = await mint.getOrCreateAssociatedAccountInfo(owner);
    return account
};

module.exports = {
    userCharge,ourCharge,vaultCharge
};
