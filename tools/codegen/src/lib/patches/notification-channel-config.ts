import fs from "node:fs";
import path from "node:path";

/**
 * Patches the notification channel config deserialization issue.
 *
 * Fixes the oneOf deserialization logic in V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig
 * to prevent the "object" schema from matching when specific config types are present.
 */
export function patchNotificationChannelConfigDeserialization(
  openapiClientDir: string,
): void {
  const configFilePath = path.join(
    openapiClientDir,
    "models",
    "v5_notifications_channels_get200_response_data_channels_inner_config.py",
  );

  if (!fs.existsSync(configFilePath)) {
    console.warn(
      `⚠️  Config file not found at ${configFilePath}, skipping patch`,
    );
    return;
  }

  let content = fs.readFileSync(configFilePath, "utf-8");

  // Replace the from_json method to fix the deserialization logic
  // The fix ensures specific config types are checked first, and the "object" schema
  // only matches if none of the specific types match
  const oldFromJsonMethod = `    @classmethod
    def from_json(cls, json_str: str) -> Self:
        """Returns the object represented by the json string"""
        instance = cls.model_construct()
        error_messages = []
        match = 0

        # deserialize data into EmailChannelConfig
        try:
            instance.actual_instance = EmailChannelConfig.from_json(json_str)
            match += 1
        except (ValidationError, ValueError) as e:
            error_messages.append(str(e))
        # deserialize data into SlackChannelConfig
        try:
            instance.actual_instance = SlackChannelConfig.from_json(json_str)
            match += 1
        except (ValidationError, ValueError) as e:
            error_messages.append(str(e))
        # deserialize data into WebhookChannelConfig
        try:
            instance.actual_instance = WebhookChannelConfig.from_json(json_str)
            match += 1
        except (ValidationError, ValueError) as e:
            error_messages.append(str(e))
        # deserialize data into object
        try:
            # validation
            instance.oneof_schema_4_validator = json.loads(json_str)
            # assign value to actual_instance
            instance.actual_instance = instance.oneof_schema_4_validator
            match += 1
        except (ValidationError, ValueError) as e:
            error_messages.append(str(e))

        if match > 1:
            # more than 1 match
            raise ValueError("Multiple matches found when deserializing the JSON string into V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig with oneOf schemas: EmailChannelConfig, SlackChannelConfig, WebhookChannelConfig, object. Details: " + ", ".join(error_messages))
        elif match == 0:
            # no match
            raise ValueError("No match found when deserializing the JSON string into V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig with oneOf schemas: EmailChannelConfig, SlackChannelConfig, WebhookChannelConfig, object. Details: " + ", ".join(error_messages))
        else:
            return instance`;

  const newFromJsonMethod = `    @classmethod
    def from_json(cls, json_str: str) -> Self:
        """Returns the object represented by the json string"""
        instance = cls.model_construct()
        error_messages = []
        match = 0

        # Try specific config types first - if any succeed, return immediately
        # This prevents the "object" schema from matching when a specific config type is present
        
        # deserialize data into EmailChannelConfig
        try:
            instance.actual_instance = EmailChannelConfig.from_json(json_str)
            match += 1
        except (ValidationError, ValueError) as e:
            error_messages.append(str(e))
        
        # If EmailChannelConfig matched, return immediately
        if match == 1:
            return instance
        
        # deserialize data into SlackChannelConfig
        try:
            instance.actual_instance = SlackChannelConfig.from_json(json_str)
            match += 1
        except (ValidationError, ValueError) as e:
            error_messages.append(str(e))
        
        # If SlackChannelConfig matched, return immediately
        if match == 1:
            return instance
        
        # deserialize data into WebhookChannelConfig
        try:
            instance.actual_instance = WebhookChannelConfig.from_json(json_str)
            match += 1
        except (ValidationError, ValueError) as e:
            error_messages.append(str(e))
        
        # If WebhookChannelConfig matched, return immediately
        if match == 1:
            return instance
        
        # Only try the "object" schema if none of the specific config types matched
        # deserialize data into object
        try:
            # validation
            instance.oneof_schema_4_validator = json.loads(json_str)
            # assign value to actual_instance
            instance.actual_instance = instance.oneof_schema_4_validator
            match += 1
        except (ValidationError, ValueError) as e:
            error_messages.append(str(e))

        if match > 1:
            # more than 1 match
            raise ValueError("Multiple matches found when deserializing the JSON string into V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig with oneOf schemas: EmailChannelConfig, SlackChannelConfig, WebhookChannelConfig, object. Details: " + ", ".join(error_messages))
        elif match == 0:
            # no match
            raise ValueError("No match found when deserializing the JSON string into V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig with oneOf schemas: EmailChannelConfig, SlackChannelConfig, WebhookChannelConfig, object. Details: " + ", ".join(error_messages))
        else:
            return instance`;

  // Check if already patched (contains the early return pattern)
  if (content.includes("# If EmailChannelConfig matched, return immediately")) {
    console.log(
      `✅ Notification channel config deserialization already patched in ${path.basename(configFilePath)}`,
    );
    return;
  }

  // Try exact string match first
  if (content.includes(oldFromJsonMethod)) {
    content = content.replace(oldFromJsonMethod, newFromJsonMethod);
    fs.writeFileSync(configFilePath, content, "utf-8");
    console.log(
      `✅ Patched notification channel config deserialization in ${path.basename(configFilePath)}`,
    );
    return;
  }

  // Try regex-based replacement for more flexible matching
  // Match the from_json method including all its content until the final return statement
  const fromJsonRegex =
    /(@classmethod\s+def from_json\(cls, json_str: str\) -> Self:[\s\S]*?return instance)/;
  const match = content.match(fromJsonRegex);
  if (match) {
    // Check if it's the old version (doesn't have early returns)
    const methodBody = match[1];
    if (
      !methodBody.includes(
        "# If EmailChannelConfig matched, return immediately",
      )
    ) {
      // Replace with new version - preserve the exact indentation from the file
      const indentMatch = content.match(/(\s+)@classmethod\s+def from_json/);
      const baseIndent = indentMatch ? indentMatch[1] : "    ";
      // Adjust new method indentation to match file's indentation
      const adjustedNewMethod = newFromJsonMethod.replace(
        /^\s{4}/gm,
        baseIndent,
      );
      content = content.replace(fromJsonRegex, adjustedNewMethod);
      fs.writeFileSync(configFilePath, content, "utf-8");
      console.log(
        `✅ Patched notification channel config deserialization (regex match) in ${path.basename(configFilePath)}`,
      );
      return;
    }
  }

  console.warn(
    `⚠️  Could not find or patch from_json method in ${configFilePath}`,
  );
}

