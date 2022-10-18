//Opt1
// function deployFunc(hre) {
//     console.log("Hi, I'm a test!")
// }
// module.exports.default = deployFunc( )

//Opt2
// module.exports.default = async (hre) => {
//     const { getNamedAccounts, deployments } = hre
//     // hre.getNamedAccounts // hre.deployments
// }

//Opt3
//Optimal way is by means of a nameless func, gettings the vars from hre

const { getNamedAccounts } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { network } = require("hardhat")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccouts, deployments }) => {
    const { deploy, log, get } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    let ethUsdPriceFeedAddress

    if (developmentChains.includes(network.name)) {
        const ethUsdAggregator = await get("MockV3Aggregator")
        ethUsdPriceFeedAddress = ethUsdAggregator.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    }

    const args = ethUsdPriceFeedAddress
    // when going for lolcahost or hardhat network, we want to use a mock
    const fundMe = await deploy("FundMe", {
        from: deployer,
        args: [args],
        log: true,
        waitConfirmation: network.config.blockConfirmations || 1,
    })

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(fundMe.address, args)
    }

    log("----------------------------------------------------")
}

module.exports.tags = ["all", "fundme"]
