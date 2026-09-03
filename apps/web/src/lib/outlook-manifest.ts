import { appBaseUrl } from "@/env";

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function outlookManifestXml(input: {
  orgSlug: string;
  orgName: string;
  variant: "unified" | "addin-only";
}): string {
  const origin = appBaseUrl();
  const org = encodeURIComponent(input.orgSlug);
  const display = xmlEscape(`SignatureOps (${input.orgName})`);
  const taskpane = `${origin}/addin/taskpane.html?org=${org}`;
  const commands = `${origin}/addin/commands.html?org=${org}`;
  const runtime = `${origin}/addin/launchevent.js`;
  const fromChanged =
    input.variant === "unified"
      ? `
            <LaunchEvent Type="OnMessageFromChanged" FunctionName="onMessageFromChangedHandler" />`
      : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp
  xmlns="http://schemas.microsoft.com/office/appforoffice/1.1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bt="http://schemas.microsoft.com/office/officeappbasictypes/1.0"
  xmlns:mailappor="http://schemas.microsoft.com/office/mailappversionoverrides/1.1"
  xsi:type="MailApp">
  <Id>5e8c2a1b-9d34-4f10-8c7a-${input.variant === "unified" ? "111111111111" : "222222222222"}</Id>
  <Version>1.0.0</Version>
  <ProviderName>SignatureOps</ProviderName>
  <DefaultLocale>en-US</DefaultLocale>
  <DisplayName DefaultValue="${display}" />
  <Description DefaultValue="Applies the organization signature at compose time. Not stored on the mailbox; not guaranteed on every outbound message." />
  <IconUrl DefaultValue="${origin}/logo.svg" />
  <HighResolutionIconUrl DefaultValue="${origin}/logo.svg" />
  <SupportUrl DefaultValue="${origin}/tr/gizlilik" />
  <Hosts>
    <Host Name="Mailbox" />
  </Hosts>
  <Requirements>
    <Sets>
      <Set Name="Mailbox" MinVersion="${input.variant === "unified" ? "1.13" : "1.10"}" />
    </Sets>
  </Requirements>
  <FormSettings>
    <Form xsi:type="ItemEdit">
      <DesktopSettings>
        <SourceLocation DefaultValue="${taskpane}" />
        <RequestedHeight>250</RequestedHeight>
      </DesktopSettings>
    </Form>
  </FormSettings>
  <Permissions>ReadWriteItem</Permissions>
  <Rule xsi:type="RuleCollection" Mode="Or">
    <Rule xsi:type="ItemIs" ItemType="Message" FormType="Edit" />
  </Rule>
  <DisableEntityHighlighting>true</DisableEntityHighlighting>
  <VersionOverrides xmlns="http://schemas.microsoft.com/office/mailappversionoverrides" xsi:type="VersionOverridesV1_0">
    <VersionOverrides xmlns="http://schemas.microsoft.com/office/mailappversionoverrides/1.1" xsi:type="VersionOverridesV1_1">
      <Requirements>
        <bt:Sets DefaultMinVersion="${input.variant === "unified" ? "1.13" : "1.10"}">
          <bt:Set Name="Mailbox" />
        </bt:Sets>
      </Requirements>
      <Hosts>
        <Host xsi:type="MailHost">
          <Runtimes>
            <Runtime resid="WebViewRuntime.Url">
              <Override type="javascript" resid="JSRuntime.Url"/>
            </Runtime>
          </Runtimes>
          <DesktopFormFactor>
            <FunctionFile resid="Commands.Url" />
            <ExtensionPoint xsi:type="LaunchEvent">
              <LaunchEvents>
                <LaunchEvent Type="OnNewMessageCompose" FunctionName="onNewMessageComposeHandler" />${fromChanged}
              </LaunchEvents>
              <SourceLocation resid="WebViewRuntime.Url" />
            </ExtensionPoint>
            <ExtensionPoint xsi:type="MessageComposeCommandSurface">
              <OfficeTab id="TabDefault">
                <Group id="msgComposeGroup">
                  <Label resid="GroupLabel" />
                  <Control xsi:type="Button" id="msgComposeOpenPaneButton">
                    <Label resid="TaskpaneButton.Label" />
                    <Supertip>
                      <Title resid="TaskpaneButton.Label" />
                      <Description resid="TaskpaneButton.Tooltip" />
                    </Supertip>
                    <Icon>
                      <bt:Image size="16" resid="Icon.16x16" />
                      <bt:Image size="32" resid="Icon.32x32" />
                      <bt:Image size="80" resid="Icon.80x80" />
                    </Icon>
                    <Action xsi:type="ShowTaskpane">
                      <SourceLocation resid="Taskpane.Url" />
                    </Action>
                  </Control>
                </Group>
              </OfficeTab>
            </ExtensionPoint>
          </DesktopFormFactor>
        </Host>
      </Hosts>
      <Resources>
        <bt:Images>
          <bt:Image id="Icon.16x16" DefaultValue="${origin}/logo.svg" />
          <bt:Image id="Icon.32x32" DefaultValue="${origin}/logo.svg" />
          <bt:Image id="Icon.80x80" DefaultValue="${origin}/logo.svg" />
        </bt:Images>
        <bt:Urls>
          <bt:Url id="Commands.Url" DefaultValue="${commands}" />
          <bt:Url id="Taskpane.Url" DefaultValue="${taskpane}" />
          <bt:Url id="WebViewRuntime.Url" DefaultValue="${commands}" />
          <bt:Url id="JSRuntime.Url" DefaultValue="${runtime}" />
        </bt:Urls>
        <bt:ShortStrings>
          <bt:String id="GroupLabel" DefaultValue="SignatureOps" />
          <bt:String id="TaskpaneButton.Label" DefaultValue="Signature" />
        </bt:ShortStrings>
        <bt:LongStrings>
          <bt:String id="TaskpaneButton.Tooltip" DefaultValue="Apply the organization signature at compose time" />
        </bt:LongStrings>
      </Resources>
    </VersionOverrides>
  </VersionOverrides>
</OfficeApp>
`;
}
