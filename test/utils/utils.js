const increaseTime = async (time) => {
    await ethers.provider.send('evm_increaseTime', [time])
    await ethers.provider.send('evm_mine', [])
}

const etherToWei = (eth) => ethers.utils.parseUnits(eth);

const createNewShow = async (contract) => {
    await contract.createShow(
        "TestShow",
        new Date(2022, 06, 01).getTime() / 1000,
        60, // in minutes
    );
}

const stringToHash = (str) => ethers.utils.keccak256(ethers.utils.toUtf8Bytes(str));

module.exports = {
    increaseTime,
    etherToWei,
    createNewShow,
    stringToHash,
}