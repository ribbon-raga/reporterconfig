module.exports = function(RED) {
	const fetch = require('node-fetch');

	const slackAPIURL = "https://slack.com/api/conversations.list";
	const cachetHQCompURL = "/api/v1/components";
	const cachetHQCompGpURL = "/api/v1/components/groups";

	function ReporterConfig(config) {
		RED.nodes.createNode(this, config);

		this.reportToSlack = config.reportToSlack || "true";
		this.reportToCachetHQ = config.reportToCachetHQ || "true";
		this.reportToGaap = config.reportToGaap || "true";

		this.slacklogs = config.slacklogs || "nodered-ctab-test-logs";
		this.slackresults = config.slackresults || "nodered-ctab-test-results";
		this.slacksummary = config.slacksummary || "nodered-ctab-test-summary";
		this.slacktoken = config.slacktoken || "";

		this.cachetcomponentgroup = config.cachetcomponentgroup || "KBS Lab CPaaS NVS";
		this.cachetcomponent = config.cachetcomponent || "LiveSupport";
		this.cachettoken = config.cachettoken || "";
		this.cachetserver = config.cachetserver || "http://status.cpaas.kandy.io:8000";

		this.gaapurl = config.gaapurl || "https://ops.genband.com";
		this.gaaptokenurl = config.gaaptokenurl || "/gaap/auth/v1/token";
		this.grant_type = config.grant_type || "client_credentials";
		this.client_id = config.client_id || "";
		this.client_secret = config.client_secret || "";
		this.site_location = config.site_location || "Staging";
		this.version = config.version || "3.4.1";
		this.test_title = config.test_title || "Demo Test";
		this.gaapinsertlog = config.gaapinsertlog || "/gaap/rest/monitor/v1/logs";
		this.gaapinsertresult = config.gaapinsertresult || "/gaap/rest/monitor/v1/testresults";
		this.gaapinsertsummary = config.gaapinsertsummary || "/gaap/rest/monitor/v1/statussummary";

		console.log('In js, values obtained: ' + config.reportToSlack + ',' + config.slacklogs + "," + config.slackresults + "," + config.slacksummary + "," + config.slacktoken +
			',' + config.reportToCachetHQ + ',' + config.cachetserver + ',' + config.cachettoken + ',' + config.cachetcomponent + ',' + config.cachetcomponentgroup +
			',' + config.reportToGaap + ',' + config.gaapurl + ',' + config.site_location + ',' + config.version + ',' + config.test_title + ',' + config.gaapinsertlog);

		var node = this;
		let msg = {};

		this.on('input', function(msg) {

			node.status({});

			node.log("reportToGaap: " + node.reportToGaap + ",reportToSlack: " + node.reportToSlack + ",reportToCachetHQ: " + node.reportToCachetHQ);

			async function process() {

				let reporterConfig = {};

				if (node.reportToSlack === "true") {
					let slackSpecInput = {
						"slacklogs": node.slacklogs,
						"slackresults": node.slackresults,
						"slacksummary": node.slacksummary,
						"slacktoken": node.slacktoken,
						"slackChannelID": ""
					};
					reporterConfig.slackSpec = slackSpecInput;

					let url = slackAPIURL + "?token=" + node.slacktoken + "&limit=1000";
					try {
						let response = await fetch(url);
						if (response.ok) {
							let result = await response.json();
							let channels = result.channels;
							let slackchannelIds = {
								logsId: "",
								resultsId: "",
								summaryId: ""
							}
							for (let i = 0; i < channels.length; i++) {
								if (channels[i].name === node.slacklogs) {
									node.log('logs channelId ' + channels[i].id);
									slackchannelIds.logsId = channels[i].id;
								}
								if (channels[i].name === node.slackresults) {
									node.log('results channelId ' + channels[i].id);
									slackchannelIds.resultsId = channels[i].id;
								}
								if (channels[i].name === node.slacksummary) {
									node.log('summary channelId ' + channels[i].id);
									slackchannelIds.summaryId = channels[i].id;
								}
							}
							reporterConfig.slackSpec["slackChannelID"] = slackchannelIds;

							node.status({
								fill: "green",
								shape: "dot",
								text: `Slack Channels found`
							});
						} else {
							node.status({
								fill: "red",
								shape: "dot",
								text: `Slack Channels NOT found`
							});
						}
					} catch (err) {
						node.log("Error in getting Slack Channels  - " + err);
						node.status({
							fill: "red",
							shape: "dot",
							text: `Slack Channels NOT found - ` + err
						});
					}
				}

				if (node.reportToCachetHQ === "true") {
					let cachetSpecInput = {
						"cachetserver": node.cachetserver,
						"cachetcomponentgroup": node.cachetcomponentgroup,
						"cachetcomponent": node.cachetcomponent,
						"cachettoken": node.cachettoken,
						"cachetComponentID": "",
						"cachetComponentGroupID": ""
					};
					reporterConfig.cachetSpec = cachetSpecInput;

					let groupurl = node.cachetserver + cachetHQCompGpURL;
					let componenturl = node.cachetserver + cachetHQCompURL;
					try {
						let response = await fetch(groupurl, {
							method: 'GET',
							headers: {
								'Content-Type': 'application/json',
								'x-cachet-token': node.cachettoken
							}
						});
						if (response.ok) {
							let result = await response.json();
							node.log('componentGroupId fetch: ' + JSON.stringify(result));
							let componentGroups = result.data;
							for (let i = 0; i < componentGroups.length; i++) {
								if (componentGroups[i].name === node.cachetcomponentgroup) {
									node.log('componentGroups ID: ' + componentGroups[i].id);
									reporterConfig.cachetSpec["cachetComponentGroupID"] = componentGroups[i].id;
								}
							}
							node.status({
								fill: "green",
								shape: "dot",
								text: `CachetHQ ComponentGroup found`
							});
						} else {
							node.status({
								fill: "red",
								shape: "dot",
								text: `CachetHQ ComponentGroup NOT found`
							});
						}
					} catch (err) {
						node.log("Error in getting ComponentGroup - " + err);
						node.status({
							fill: "red",
							shape: "dot",
							text: `CachetHQ ComponentGroup NOT found - ` + err
						});
					}

					try {
						let responseComp = await fetch(componenturl, {
							method: 'GET',
							headers: {
								'Content-Type': 'application/json',
								'x-cachet-token': node.cachettoken
							}
						});
						if (responseComp.ok) {
							let resultComp = await responseComp.json();
							node.log('component fetch: ' + JSON.stringify(resultComp));
							let components = resultComp.data;
							for (let i = 0; i < components.length; i++) {
								if (components[i].name === node.cachetcomponent && components[i].group_id === reporterConfig.cachetSpec["cachetComponentGroupID"]) {
									node.log('components ID: ' + components[i].id);
									reporterConfig.cachetSpec["cachetComponentID"] = components[i].id;
								}
							}
							node.status({
								fill: "green",
								shape: "dot",
								text: `CachetHQ Component found`
							});
						} else {
							node.status({
								fill: "red",
								shape: "dot",
								text: `CachetHQ Component NOT found`
							});
						}
					} catch (err) {
						node.log("Error in getting Component - " + err);
						node.status({
							fill: "red",
							shape: "dot",
							text: `CachetHQ Component NOT found - ` + err
						});
					}
				}


				if (node.reportToGaap === "true") {
					let gaapSpecInput = {
						"gaapurl": node.gaapurl,
						//"gaaptokenurl": node.gaaptokenurl,
						//"client_id":node.client_id,
						//"client_secret":node.client_secret,
						//"grant_type":node.grant_type,
						"gaapinsertlog": node.gaapinsertlog,
						"gaapinsertresult": node.gaapinsertresult,
						"gaapinsertsummary": node.gaapinsertsummary,
						"siteLocation": node.site_location,
						"version": node.version,
						"testTitle": node.test_title,
						"gaapauthheaders": ""
					};

					reporterConfig.gaapSpec = gaapSpecInput;

					try {

						let auth = {
							grant_type: node.grant_type,
							client_id: node.client_id,
							client_secret: node.client_secret
						};
						let url = node.gaapurl.concat(node.gaaptokenurl);
						let response = await fetch(url, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/x-www-form-urlencoded'
							},
							body: new URLSearchParams(auth)
						});
						if (response.ok) {
							let resultGaap = await response.json();
							node.log('gaap fetch: ' + JSON.stringify(resultGaap));
							let accessToken = resultGaap.token_type + " " + resultGaap.access_token;
							node.log("accessToken: " + accessToken);
							reporterConfig.gaapSpec["gaapauthheaders"] = {
								"Content-Type": "application/json",
								"Authorization": accessToken
							};
							node.status({
								fill: "green",
								shape: "dot",
								text: `GAAP Token obtained`
							});
						} else {
							node.log("Error in getting GAAP Token - " + err);
							node.status({
								fill: "red",
								shape: "dot",
								text: `GAAP Token NOT obtained`
							});
						}
					} catch (err) {
						node.status({
							fill: "red",
							shape: "dot",
							text: `GAAP Token NOT obtained - ` + err
						});
					}
				}
				msg.reporterConfig = reporterConfig;
				node.send(msg);
			}
			process();
		});
	}
	RED.nodes.registerType("reporterconfig", ReporterConfig);
}