/**
 * Accessible Image Component - WCAG 1.1.1 Compliant
 *
 * This component wraps standard img elements to ensure proper alt text
 * according to WCAG 2.1 Level AA standards.
 *
 * Usage:
 *   // Content image - descriptive alt text
 *   <ImageWithAlt
 *     src="/logo.png"
 *     alt="Company logo"
 *     width={100}
 *     height={100}
 *   />
 *
 *   // Decorative image - empty alt text
 *   <ImageWithAlt
 *     src="/decoration.png"
 *     alt=""
 *     decorative
 *   />
 */

import React from 'react'
import { cn } from '@/lib/utils'

interface ImageWithAltProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /**
   * Alt text for the image.
   * - For content images: provide descriptive text (e.g., "Product logo")
   * - For decorative images: use empty string "" and set decorative=true
   * - Required for WCAG 1.1.1 compliance
   */
  alt: string
  /**
   * Whether this is a purely decorative image.
   * When true, aria-hidden is added for screen readers.
   * The alt attribute should still be "" (empty string).
   */
  decorative?: boolean
  /**
   * Standard img attributes
   */
  src: string
}

/**
 * Accessible image component that ensures WCAG 1.1.1 compliance.
 *
 * All images must either:
 * 1. Have descriptive alt text for content images (convey meaning/information)
 * 2. Have alt="" and decorative=true for purely decorative images
 *
 * @example
 * // Content image
 * <ImageWithAlt
 *   src="/user-avatar.jpg"
 *   alt="Sarah's profile picture"
 *   width={48}
 *   height={48}
 * />
 *
 * @example
 * // Decorative image
 * <ImageWithAlt
 *   src="/decorative-divider.svg"
 *   alt=""
 *   decorative
 * />
 */
export function ImageWithAlt({
  alt,
  decorative = false,
  className,
  ...props
}: ImageWithAltProps) {
  if (decorative && alt !== '') {
    console.warn(
      'ImageWithAlt: Decorative images should have alt="" (empty string)',
    )
  }

  if (!decorative && alt === '') {
    console.warn(
      'ImageWithAlt: Content images should have descriptive alt text',
    )
  }

  return (
    <img
      alt={alt}
      aria-hidden={decorative}
      className={cn('', className)}
      {...props}
    />
  )
}

/**
 * Legacy img element warning
 *
 * Don't use bare <img> tags - use <ImageWithAlt> instead to ensure
 * WCAG 1.1.1 compliance on all images.
 */
