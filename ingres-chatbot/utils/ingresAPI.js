import axios from 'axios';

export async function callIngresAPI(params) {
  const payload = {
    locname: params.location,
    loctype: params.loctype,
    view: "admin",
    locuuid: "", // Will need to map location to UUID
    stateuuid: "",
    component: params.component,
    period: params.period,
    year: params.year,
    category: "all",
    computationType: "normal",
    approvalLevel: 1,
    verificationStatus: 1
  };

  try {
    const response = await axios.post(
      process.env.INGRES_API_URL,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      }
    );

    return response.data;
  } catch (error) {
    console.error('INGRES API Error:', error);
    throw new Error('Failed to fetch data from INGRES');
  }
}