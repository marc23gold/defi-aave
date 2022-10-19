const { getNamedAccounts } = require("hardhat");
const { getWeth, AMOUNT } = require("../scripts/getWeth");

async function main() {
  //protocol treats everything as an ERC20 token
  await getWeth();
  const { deployer } = await getNamedAccounts();
  const lendingPool = await getLendingPool(deployer)
  console.log(`LendingPool address ${lendingPool.address}`)

  //deposit
  const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"

  await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer )
  console.log("Depositing...")
  await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0)
  console.log("Depsited")

  //Borrowing
  //how much you have:  borrowed, in collateral, can borrow
  let {availableBorrowsETH, totalDebtETH} = await getBorrowUserData(lendingPool, deployer)
  //get the conversion rate to DAI
  const daiPrice = await getDaiPrice()
  const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1/daiPrice.toNumber())
  console.log(`You can borrow ${amountDaiToBorrow} DAI`)
  //Weth should be wei in the variable name 
  const amountDaiToBorrowWeth = ethers.utils.parseEther(amountDaiToBorrow.toString())
  //can start borrowing now
  const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
  await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWeth, deployer)
  await getBorrowUserData(lendingPool, deployer)
  //repay
  await repay(amountDaiToBorrowWeth, daiTokenAddress, lendingPool, deployer)
  await getBorrowUserData(lendingPool, deployer)

} 

async function repay(amount, daiAddress, lendingPool, account) {
  await approveErc20(daiAddress, lendingPool.address, amount, account)
  const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
  await repayTx.wait(1)
  console.log("Repaid")
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrow, account) {
  const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrow, 1, 0, account)
  await borrowTx.wait(1)
  console.log("You've borrowed!")
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrow, account) {
  const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrow, 1, 0, account)
  await borrowTx.wait(1)
  console.log("You've borrowed ")
}

async function getBorrowUserData(lendingPool, account) {
  const {totalCollateralETH, totalDebtETH, availableBorrowsETH} = await lendingPool.getUserAccountData(account)
  console.log(`You have ${totalCollateralETH} worth of ETH deposited`)
  console.log(`You have ${totalDebtETH} worth of ETH borrowed`)
  console.log( `You have ${availableBorrowsETH} worth of Ether`)
  return {availableBorrowsETH, totalDebtETH }
}

async function approveErc20(contractAddress, spenderAddress, amountToSpend, account) {
  const erc20Token = await ethers.getContractAt("IERC20", contractAddress, account)
  const tx = await erc20Token.approve(spenderAddress, amountToSpend)
  await tx.wait(1)
  console.log("Approved")

}

async function getLendingPool(account) {
  //Lending Pool 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
  const lendingPoolAddressesProvider = await ethers.getContractAt("ILendingPoolAddressesProvider", "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5", account)
  const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()
  const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account)
  return lendingPool
}

async function getDaiPrice() {
  const daiEthPriceFeed = await ethers.getContractAt("AggregatorV3Interface",  "0x773616E4d11A78F511299002da57A0a94577F1f4")
  const price = (await daiEthPriceFeed.latestRoundData())[1]
  console.log(`The DAI/ETH price is ${price.toString()}`)
  return price
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
