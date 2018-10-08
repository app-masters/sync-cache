// flow-typed signature: 19bf43ad43b65f7c48e650bb7ad9ade2
// flow-typed version: da30fe6876/react-collapsible_v2.0.x/flow_>=v0.54.x

import { Component } from "react";

declare module "react-collapsible" {
  declare type Props = {
    trigger: string | React$Node,
    triggerWhenOpen?: string | React$Node,
    triggerDisabled?: false,
    transitionTime?: number,
    easing?: string,
    open?: boolean,
    accordionPosition?: string,
    handleTriggerClick?: (accordionPosition?: string | number) => void,
    onOpen?: () => void,
    onClose?: () => void,
    onOpening?: () => void,
    onClosing?: () => void,
    lazyRender?: boolean,
    overflowWhenOpen?:
      | "hidden"
      | "visible"
      | "auto"
      | "scroll"
      | "inherit"
      | "initial"
      | "unset",
    triggerSibling?: React$Node,
    classParentString?: string,
    className?: string,
    openedClassName?: string,
    triggerClassName?: string,
    triggerOpenedClassName?: string,
    contentOuterClassName?: string,
    contentInnerClassName?: string
  };

  declare class Collapsible extends Component<Props> {}
  declare module.exports: typeof Collapsible;
}
