import '@kroma/hardhat-deploy-config'
import '@nomiclabs/hardhat-ethers'
import { DeployFunction } from 'hardhat-deploy/dist/types'

import {
  assertContractVariable,
  deploy,
  getDeploymentAddress,
} from '../../src/deploy-utils'

const deployFn: DeployFunction = async (hre) => {
  const validatorPoolProxyAddress = await getDeploymentAddress(
    hre,
    'ValidatorPoolProxy'
  )
  const colosseumProxyAddress = await getDeploymentAddress(
    hre,
    'ColosseumProxy'
  )

  // Use default starting time if not provided
  let deployL2StartingTimestamp =
    hre.deployConfig.l2OutputOracleStartingTimestamp
  if (deployL2StartingTimestamp < 0) {
    const l1StartingBlock = await hre.ethers.provider.getBlock(
      hre.deployConfig.l1StartingBlockTag
    )
    if (l1StartingBlock === null) {
      throw new Error(
        `Cannot fetch block tag ${hre.deployConfig.l1StartingBlockTag}`
      )
    }
    deployL2StartingTimestamp = l1StartingBlock.timestamp
  }

  await deploy(hre, 'L2OutputOracle', {
    args: [
      validatorPoolProxyAddress,
      colosseumProxyAddress,
      hre.deployConfig.l2OutputOracleSubmissionInterval,
      hre.deployConfig.l2BlockTime,
      0,
      0,
      hre.deployConfig.finalizationPeriodSeconds,
    ],
    isProxyImpl: true,
    initArgs: [
      hre.deployConfig.l2OutputOracleStartingBlockNumber,
      deployL2StartingTimestamp,
    ],
    postDeployAction: async (contract) => {
      await assertContractVariable(
        contract,
        'SUBMISSION_INTERVAL',
        hre.deployConfig.l2OutputOracleSubmissionInterval
      )
      await assertContractVariable(
        contract,
        'L2_BLOCK_TIME',
        hre.deployConfig.l2BlockTime
      )
      await assertContractVariable(
        contract,
        'COLOSSEUM',
        colosseumProxyAddress
      )
      await assertContractVariable(
        contract,
        'VALIDATOR_POOL',
        validatorPoolProxyAddress
      )
      await assertContractVariable(
        contract,
        'FINALIZATION_PERIOD_SECONDS',
        hre.deployConfig.finalizationPeriodSeconds
      )
    },
  })
}

deployFn.tags = ['L2OutputOracle', 'setup', 'l1']

export default deployFn
