"use strict";

const got = require("got");
const { isBase64 } = require("validator");
const btoa = require("btoa");
const axios = require('axios');


module.exports = function({ apiKey = "" }) {
  const _apiKey = apiKey;
  const _rest = got.extend({
    prefixUrl: "https://synthetics.newrelic.com/synthetics/api",
    responseType: "json",
    headers: {
      "X-Api-Key": _apiKey,
    },
  });

  const NR_API_URL = "https://api.newrelic.com/v2";
  const REST_API_KEY = 'c9e3f1293a07a54b85e4ed7f23197e1af3068ffaf2d909e';
  let axios_config = {
    headers: {"X-Api-Key": REST_API_KEY} // request headers
  };

  function _parseError(error){
    var { statusCode, message, body } = error;

    if (typeof statusCode === "undefined" && message && message.length > 0) {
      if (message.includes("Response code")) {
        const code = message.match(/\d+/g);
        statusCode = code.length > 0 ? code[0] : 200;
      }
    }

    return {
      statusCode,
      message,
      body,
    };
  }

  /**
   * Returns the list of alert policies for a given api key
   */
  async function getAlertPolicies() {
    let currentPage = 1;
    let alertPolicies = [];
    let hadResponse;

    // Iterate over the alert policy pages and collect all policies into an object to return
    do {
      try {
        console.log('[NR Client] getAlertPolicies page', currentPage);

        const url = NR_API_URL + "/alerts_policies.json?page=" + currentPage;
        const response = await axios.get(url, axios_config);

        if (response.data.policies.length > 0) {
          let policies = response.data.policies;

          alertPolicies = alertPolicies.concat(policies);

          // Try the next page
          currentPage++;
          hadResponse = true;
        } else {
          hadResponse = false;
        }
      } catch (e) {
        console.error('[NR Client] Failed to get New Relic alert polices, response code:', e.response.status, e.response.statusText);
        return false
      }
    } while (hadResponse);

    console.log('[NR Client] policies:', Object.keys(alertPolicies).length);

    return alertPolicies;
  }

  /**
   * Returns the list of alert channels for a given api key
   */
  async function getAlertChannels() {
    let currentPage = 1;
    let alertChannels = [];
    let hadResponse;

    // Iterate over the alert policy pages and collect all policies into an object to return
    do {
      try {
        console.log('[NR Client] getAlertChannels page', currentPage);

        const url = NR_API_URL + "/alerts_channels.json?page=" + currentPage;
        const response = await axios.get(url, axios_config);

        if (response.data.channels.length > 0) {
          let channels = response.data.channels;

          alertChannels = alertChannels.concat(channels);

          // Try the next page
          currentPage++;
          hadResponse = true;
        } else {
          hadResponse = false;
        }
      } catch (e) {
        console.error('[NR Client] Failed to get New Relic alert channels, response code:', e.response.status, e.response.statusText);
        return false
      }
    } while (hadResponse);

    console.log('[NR Client] channels:', alertChannels.length);

    return alertChannels;
  }

  /**
   * Returns the list of alert conditions for all synthetic conditions for every policy in polices
   */
  async function getAlertConditions(policies) {
    let singleLocationConditions = [];
    let multiLocationConditions = [];
    let alertConditions = {};

    // Iterate over the alert policies and fetch the synthetic conditions for each
    for (let i = 0; i < 10; i++) {
      let policy = policies[i];

      try {
        let singleLocation;
        let multiLocation;

        // Get the simple single location synthetic conditions
        console.log('[NR Client] getAlertConditions single location for policy:', policy.id, policy.name);
        let url = NR_API_URL + "/alerts_synthetics_conditions.json?policy_id=" + policy.id;
        let response = await axios.get(url, axios_config);

        if (response.data.synthetics_conditions.length > 0) {
          singleLocation = response.data.synthetics_conditions;
          singleLocationConditions = singleLocationConditions.concat(singleLocation);
        }

        // Get the multi location synthetic conditions
        console.log('[NR Client] getAlertConditions multi location for policy:', policy.id, policy.name);
        url = NR_API_URL + "/alerts_location_failure_conditions/policies/" + policy.id + ".json";
        response = await axios.get(url, axios_config);

        if (response.data.location_failure_conditions.length > 0) {
          multiLocation = response.data.location_failure_conditions;
          multiLocationConditions = multiLocationConditions.concat(multiLocation);
        }

        alertConditions[policy.id] = {
          policy_name: policy.name,
          singleLocation: singleLocation ? singleLocation : [],
          multiLocation: multiLocation ? multiLocation : [],
        }

      } catch (e) {
        console.error('[NR Client] Failed to get New Relic alert conditions for policy:', policy.name, policy.id, e.response, e.response);
        return false
      }
    }

    console.log('[NR Client] single location channels:', singleLocationConditions.length);
    console.log('[NR Client] multi location channels:', multiLocationConditions.length);
    console.log('[NR Client] total channels:', singleLocationConditions.length + multiLocationConditions.length);

    return alertConditions;
  }

  async function getMonitors() {
    try {
      const monitors = await _rest.paginate.all("v3/monitors", {
        pagination: {
          transform: response => {
            return response.body.monitors
          },
        }
      });

      return {
        statusCode: 200,
        message: "",
        body: {
          count: monitors.length,
          monitors
        },
      };
    } catch (error) {
      var { statusCode, message, body } = _parseError(error);

      console.log(
        `Failed to get all monitors. ${statusCode} ${message} ${body}`
      );
      return {
        statusCode,
        message,
        body,
      };
    }
  }

  async function getScript(id) {
    try {
      const { statusCode, message, body } = await _rest(
        `v3/monitors/${id}/script`
      );
      return {
        statusCode,
        message,
        body,
      };
    } catch (error) {
      var { statusCode, message, body } = _parseError(error);
      console.log(`Failed to getScript. ${statusCode} ${message} ${body}`);
      return {
        statusCode,
        message,
        body,
      };
    }
  }

  async function updateScript(id, data) {
    try {
      const b64Data = isBase64(data) ? data : btoa(data);

      const { statusCode, message, body } = await _rest(
        `v3/monitors/${id}/script`,
        {
          method: "PUT",
          json: {
            scriptText: b64Data,
          },
        }
      );
      return {
        statusCode,
        message,
        body,
      };
    } catch (error) {
      var { statusCode, message, body } = _parseError(error);
      console.log(`Failed to updateScript. ${statusCode} ${message} ${body}`);
      return {
        statusCode,
        message,
        body,
      };
    }
  }

  async function getLocations() {
    try {
      const { statusCode, message, body } = await _rest("v1/locations");

      return {
        statusCode,
        message,
        body
      };
    } catch (error) {
      var { statusCode, message, body } = _parseError(error);

      console.log(
        `Failed to get all locations. ${statusCode} ${message} ${body}`
      );
      return {
        statusCode,
        message,
        body,
      };
    }
  }

  async function createScript(name, type, frequency, locations, status) {
    try {

      const {statusCode, message, headers} = await _rest(
        `v3/monitors`,
        {
          method: "POST",
          json: {
            name: name,
            type: type,
            frequency: frequency,
            locations: locations,
            status: status
          },
        }
      );

      return {
        statusCode,
        message,
        body: headers
      };
    } catch (error) {
      var { statusCode, message, body } = _parseError(error);
      console.log(`Failed to createScript. ${statusCode} ${message} ${body}`);
      return {
        statusCode,
        message,
        body,
      };
    }
  }

  async function deleteScript(id) {
    try {

      const { statusCode, message, body } = await _rest(`v3/monitors/${id}`, {
        method: "DELETE",
      });

      return {
        statusCode,
        message,
        body
      };
    } catch (error) {
      var { statusCode, message, body } = _parseError(error);
      console.log(`Failed to deleteScript. ${statusCode} ${message} ${body}`);
      return {
        statusCode,
        message,
        body,
      };
    }
  }

  async function updateScriptSetting(id, frequency, status, locations) {
    try {
      let json = {
        frequency: frequency,
        status: status
      }
      if (locations.length > 0) {
        json = {...json, locations}
      }
      const { statusCode, message, body } = await _rest(`v3/monitors/${id}`, {
        method: "PATCH",
        json: json,
      });

      return {
        statusCode,
        message,
        body
      };
    } catch (error) {
      var { statusCode, message, body } = _parseError(error);
      console.log(`Failed to updateScriptSetting. ${statusCode} ${message} ${body}`);
      return {
        statusCode,
        message,
        body,
      };
    }
  }

  return {
    getAlertConditions,
    getAlertChannels,
    getAlertPolicies,
    getMonitors,
    getScript,
    updateScript,
    getLocations,
    createScript,
    deleteScript,
    updateScriptSetting
  };
};
