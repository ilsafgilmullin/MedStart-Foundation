import { redirect } from 'next/navigation'

/**
 * Compatibility route for bookmarks and old links.
 * MedStart uses the term "tutor" throughout the product.
 */
export default function LegacyTeacherRegistrationPage() {
  redirect('/register/tutor')
}
