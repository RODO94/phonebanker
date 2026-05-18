/**
 * This is the final step in the organiser flow
 * The figma link is here: https://www.figma.com/design/2bSUA8wuI0nY6E3eN0Cesd/Phonebanker?node-id=0-176&m=dev
 * The user should see their script and message previewed
 * If they are happy, they should see a button to 'Submit session'
 * This will trigger a POST request to the Airtable API to create a new session
 * From the resposne we should get a sessionid
 * After a successful request the area should change to a joining UI
 * They should also see a freshly created 'join link' which they can copy and share with their volunteers
 * This join link should have a unique sessionid in the URL which we can get from the Airtable API response
 * 
 */

export const SendLink = () => {
  return <div>SendLink</div>;
};