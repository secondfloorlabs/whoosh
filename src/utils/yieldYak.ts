import axios from 'axios';


export const getYieldYakFarms = async () => {
  const response = await axios.get(
    `https://staging-api.yieldyak.com/farms`
  );

  if (!response || response.data.length <= 0) {
    throw new Error(`No YY farms`);
  }

  return response.data;
};


 export const getYieldYakApys = async () => {
    const response = await axios.get(
      `https://staging-api.yieldyak.com/apys`
    );
  
    if (!response || response.data.length <= 0) {
      throw new Error(`No YY farms`);
    }
  
    return response.data;
  };
