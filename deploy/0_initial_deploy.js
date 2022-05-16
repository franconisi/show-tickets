// define contract name
const TOKEN_CONTRACT = "TokenTickets";
const CORE_CONTRACT = "TicketsCore";

module.exports = async ({ getNamedAccounts, deployments, network }) => {
	// take function deploy from deployments parameter
	const { deploy } = deployments;
	// get owner address from namedAccounts defined in config
	const { deployer } = await getNamedAccounts();
	// deploy the contracts
	const tokenDeploy = await deploy(TOKEN_CONTRACT, {
		from: deployer,
		log: true,
	});
	await deploy(CORE_CONTRACT, {
		from: deployer,
		log: true,
		args: [
			tokenDeploy.address
		]
	});
};

module.exports.tags = [TOKEN_CONTRACT, CORE_CONTRACT];
