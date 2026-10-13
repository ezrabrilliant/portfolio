import type { JSX } from "react";
import { Text } from "@react-three/drei";
import { FONT_URLS } from "./fonts";

export function WorldText({
  text,
  position,
  rotationY = 0,
  size = 0.5,
  color = "#1d2a33",
  font = "ui",
  anchorX = "center",
  maxWidth,
}: {
  text: string;
  position: [number, number, number];
  rotationY?: number;
  size?: number;
  color?: string;
  font?: "ui" | "pixel";
  anchorX?: "left" | "center" | "right";
  maxWidth?: number;
}): JSX.Element {
  return (
    <Text
      position={position}
      rotation={[0, rotationY, 0]}
      fontSize={size}
      color={color}
      font={FONT_URLS[font]}
      anchorX={anchorX}
      anchorY="middle"
      textAlign={anchorX === "center" ? "center" : anchorX}
      maxWidth={maxWidth}
      letterSpacing={font === "ui" ? -0.01 : 0}
    >
      {text}
    </Text>
  );
}
