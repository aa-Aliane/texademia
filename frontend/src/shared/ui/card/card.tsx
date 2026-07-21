import React from "react";
import styles from "./Card.module.css";

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, children, className }: CardProps) {
  return (
    <div className={`${styles.card} ${className ?? ""}`}>
      {title && <div className={styles.cardTitle}>{title}</div>}
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}
