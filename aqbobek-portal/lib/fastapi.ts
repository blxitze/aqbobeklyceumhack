import axios from 'axios'
export const fastapi = axios.create({
  baseURL: process.env.FASTAPI_URL,
  headers: { 'X-Internal-Token': process.env.INTERNAL_SECRET }
})
