const { deployments, ethers, getNamedAccounts } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", function () {
          let fundMe
          let deployer
          let mockV3Aggregator
          const sendValue = ethers.utils.parseEther("1") // eth1 to wei1000000000000000000 (1e18)
          beforeEach(async function () {
              // deploy our FundMe contract using Hardhat-deploy
              // const accounts = await ethers.getSigners() (read what accounts has in hardhat.config for this network)
              // const accountZero = accounts[0]
              deployer = (await getNamedAccounts()).deployer // read what accounts has in hardhat.config for this network
              await deployments.fixture(["all"]) // deploys everything we have in the deploy folder, can use tags
              fundMe = await ethers.getContract("FundMe", deployer) // get from deployments the last version of a contract
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              )
          })

          describe("constructor", function () {
              it("Sets the aggregator address correctly", async function () {
                  const response = await fundMe.getPriceFeed()
                  assert.equal(response, mockV3Aggregator.address)
              })
          })

          describe("fund", function () {
              // https://ethereum-waffle.readthedocs.io/en/latest/matchers.html
              // could also do assert.fail
              it("Fails if you don't send enough ETH", async function () {
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "You need to spend more ETH!"
                  )
              })

              it("Updated the amount funded data structure", async function () {
                  await fundMe.fund({ value: sendValue }) // I set address to deployer before
                  const response = await fundMe.getAddressToAmountFunded(
                      deployer
                  )
                  assert.equal(response.toString(), sendValue.toString())
              })

              it("Adds funder to the array of getFunder", async function () {
                  await fundMe.fund({ value: sendValue })
                  const funder = await fundMe.getFunder(0)
                  assert.equal(funder, deployer)
              })
          })

          describe("withdraw", function () {
              beforeEach(async function () {
                  await fundMe.fund({ value: sendValue })
              })

              it("Withdraw ETH from a single founder", async function () {
                  // Arrange
                  const startingFundMeBalanace =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)
                  // Act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)
                  // gasCost

                  // Assert
                  assert.equal(endingFundMeBalance, 0) // the deployer withdrew everything
                  assert.equal(
                      startingFundMeBalanace
                          .add(startingDeployerBalance)
                          .toString(), // best wayt to sum bigNumbers
                      endingDeployerBalance.add(gasCost).toString() // the deployer expent gas in the process
                  )
              })

              it("Allows us to withdraw with multiple getFunder", async function () {
                  // Arrange
                  const accounts = await ethers.getSigners()
                  for (let i = 1 /*i=0 is the deployer*/; i < 6; i++) {
                      // I have to connect each account to the contract. FundMe is connected using deployer
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      )
                      await fundMeConnectedContract.fund({ value: sendValue })
                  }
                  const startingFundMeBalanace =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  //Act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  //Assert
                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalanace
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )
              })

              it("Cheaper withdraw testing...", async function () {
                  // Arrange
                  const accounts = await ethers.getSigners()
                  for (let i = 1 /*i=0 is the deployer*/; i < 6; i++) {
                      // I have to connect each account to the contract. FundMe is connected using deployer
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      )
                      await fundMeConnectedContract.fund({ value: sendValue })
                  }
                  const startingFundMeBalanace =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  //Act
                  const transactionResponse = await fundMe.cheaperWithdraw()
                  const transactionReceipt = await transactionResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  //Assert
                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalanace
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )
              })

              it("Only allows the Owner to withdraw", async () => {
                  const accounts = await ethers.getSigners()
                  const attacker = accounts[1]
                  const attackerConnectedContract = fundMe.connect(attacker)
                  await expect(
                      attackerConnectedContract.withdraw()
                  ).to.be.revertedWith("FundMe__NotOwner")
                  await expect(fundMe.withdraw())
              })
          })
      })
