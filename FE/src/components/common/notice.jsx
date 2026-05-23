import React from 'react';

const FeedbackNotice = () => (
<div>
  <div className="flex flex-col items-start gap-5 p-3 w-[520px] rounded-xl bg-[#edf3fa]">
    <div className="flex items-start gap-2 self-stretch">
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12ZM11 16V12C11 11.4477 11.4477 11 12 11C12.5523 11 13 11.4477 13 12V16C13 16.5523 12.5523 17 12 17C11.4477 17 11 16.5523 11 16ZM12.0098 7C12.5621 7 13.0098 7.44772 13.0098 8C13.0098 8.55228 12.5621 9 12.0098 9H12C11.4477 9 11 8.55228 11 8C11 7.44772 11.4477 7 12 7H12.0098ZM23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12Z" fill="#262626" />
      </svg>
      <div className="main_text flex flex-col items-start gap-1">
        <div className="flex items-start gap-2.5 self-stretch title-1 text-neutral-800 font-['Inter'] font-bold leading-[150%]">
          Title
        </div>
        <div className="flex items-start gap-2.5 self-stretch text-1 text-[#4d4d4d] font-['Inter'] text-[.8125rem] leading-[150%]">
          text
        </div>
      </div>
      <div className="flex items-center">
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.2929 4.29301C18.6834 3.90275 19.3165 3.90258 19.707 4.29301C20.0974 4.68345 20.0972 5.31653 19.707 5.70707L13.414 12L19.707 18.293C20.0973 18.6835 20.0974 19.3166 19.707 19.7071C19.3165 20.0974 18.6834 20.0974 18.2929 19.7071L11.9999 13.4141L5.70695 19.7071C5.31642 20.0975 4.68337 20.0975 4.29289 19.7071C3.90256 19.3166 3.90255 18.6835 4.29289 18.293L10.5859 12L4.29289 5.70707C3.90237 5.31655 3.90237 4.68354 4.29289 4.29301C4.68341 3.90249 5.31643 3.90249 5.70695 4.29301L11.9999 10.586L18.2929 4.29301Z" fill="#919599" />
        </svg>
      </div>
    </div>
    <div className="flex items-start gap-2">
      <div className="flex justify-center items-center gap-2 pt-[0.9375rem] pb-[0.9375rem] px-4 rounded-xl border-2 border-[#dadfe5] button text-neutral-800 font-['Inter'] text-sm font-semibold leading-[130%]">
        Button
      </div>
      <div className="flex justify-center items-center gap-2 pt-[0.9375rem] pb-[0.9375rem] px-4 rounded-xl border-2 border-[#919599]/0 button-1 text-neutral-800 font-['Inter'] text-sm font-semibold leading-[130%]">
        Button
      </div>
    </div>
  </div>
  <div className="flex flex-col items-start gap-5 p-3 w-[520px] rounded-xl bg-[#fcc]">
    <div className="flex items-start gap-2 self-stretch">
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12ZM12.0098 15C12.5621 15 13.0098 15.4477 13.0098 16C13.0098 16.5523 12.5621 17 12.0098 17H12C11.4477 17 11 16.5523 11 16C11 15.4477 11.4477 15 12 15H12.0098ZM11 12V8C11 7.44772 11.4477 7 12 7C12.5523 7 13 7.44772 13 8V12C13 12.5523 12.5523 13 12 13C11.4477 13 11 12.5523 11 12ZM23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12Z" fill="#CC2929" />
      </svg>
      <div className="main_text-1 flex flex-col items-start gap-1">
        <div className="flex items-start gap-2.5 self-stretch title-3 text-[#cc2929] font-['Inter'] font-bold leading-[150%]">
          Title
        </div>
        <div className="flex items-start gap-2.5 self-stretch text-3 text-[#cc2929] font-['Inter'] text-[.8125rem] leading-[150%]">
          text
        </div>
      </div>
      <div className="flex items-center">
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.2929 4.29301C18.6834 3.90275 19.3165 3.90258 19.707 4.29301C20.0974 4.68345 20.0972 5.31653 19.707 5.70707L13.414 12L19.707 18.293C20.0973 18.6835 20.0974 19.3166 19.707 19.7071C19.3165 20.0974 18.6834 20.0974 18.2929 19.7071L11.9999 13.4141L5.70695 19.7071C5.31642 20.0975 4.68337 20.0975 4.29289 19.7071C3.90256 19.3166 3.90255 18.6835 4.29289 18.293L10.5859 12L4.29289 5.70707C3.90237 5.31655 3.90237 4.68354 4.29289 4.29301C4.68341 3.90249 5.31643 3.90249 5.70695 4.29301L11.9999 10.586L18.2929 4.29301Z" fill="#919599" />
        </svg>
      </div>
    </div>
    <div className="flex items-start gap-2">
      <div className="flex justify-center items-center gap-2 pt-[0.9375rem] pb-[0.9375rem] px-4 rounded-xl border-2 border-[#dadfe5] button-2 text-neutral-800 font-['Inter'] text-sm font-semibold leading-[130%]">
        Button
      </div>
      <div className="flex justify-center items-center gap-2 pt-[0.9375rem] pb-[0.9375rem] px-4 rounded-xl border-2 border-[#919599]/0 button-3 text-neutral-800 font-['Inter'] text-sm font-semibold leading-[130%]">
        Button
      </div>
    </div>
  </div>
  <div className="flex flex-col items-start gap-5 p-3 w-[520px] rounded-xl bg-[#f2f2aa]">
    <div className="flex items-start gap-2 self-stretch">
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12ZM12.0098 15C12.5621 15 13.0098 15.4477 13.0098 16C13.0098 16.5523 12.5621 17 12.0098 17H12C11.4477 17 11 16.5523 11 16C11 15.4477 11.4477 15 12 15H12.0098ZM11 12V8C11 7.44772 11.4477 7 12 7C12.5523 7 13 7.44772 13 8V12C13 12.5523 12.5523 13 12 13C11.4477 13 11 12.5523 11 12ZM23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12Z" fill="#737300" />
      </svg>
      <div className="main_text-2 flex flex-col items-start gap-1">
        <div className="flex items-start gap-2.5 self-stretch title-5 text-[#737300] font-['Inter'] font-bold leading-[150%]">
          Title
        </div>
        <div className="flex items-start gap-2.5 self-stretch text-5 text-[#737300] font-['Inter'] text-[.8125rem] leading-[150%]">
          text
        </div>
      </div>
      <div className="flex items-center">
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.2929 4.29295C18.6834 3.90269 19.3165 3.90252 19.707 4.29295C20.0974 4.68339 20.0972 5.31647 19.707 5.70701L13.414 12L19.707 18.293C20.0973 18.6835 20.0974 19.3165 19.707 19.707C19.3165 20.0973 18.6834 20.0973 18.2929 19.707L11.9999 13.414L5.70695 19.707C5.31642 20.0974 4.68337 20.0975 4.29289 19.707C3.90256 19.3165 3.90255 18.6834 4.29289 18.293L10.5859 12L4.29289 5.70701C3.90237 5.31649 3.90237 4.68348 4.29289 4.29295C4.68341 3.90243 5.31643 3.90243 5.70695 4.29295L11.9999 10.5859L18.2929 4.29295Z" fill="#919599" />
        </svg>
      </div>
    </div>
    <div className="flex items-start gap-2">
      <div className="flex justify-center items-center gap-2 pt-[0.9375rem] pb-[0.9375rem] px-4 rounded-xl border-2 border-[#dadfe5] button-4 text-neutral-800 font-['Inter'] text-sm font-semibold leading-[130%]">
        Button
      </div>
      <div className="flex justify-center items-center gap-2 pt-[0.9375rem] pb-[0.9375rem] px-4 rounded-xl border-2 border-[#919599]/0 button-5 text-neutral-800 font-['Inter'] text-sm font-semibold leading-[130%]">
        Button
      </div>
    </div>
  </div>
  <div className="flex flex-col items-start gap-5 p-3 w-[520px] rounded-xl bg-[#c3e5c3]">
    <div className="flex items-start gap-2 self-stretch">
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.2929 7.29295C18.6834 6.90243 19.3164 6.90243 19.707 7.29295C20.0975 7.68348 20.0975 8.31649 19.707 8.70702L10.707 17.707C10.3164 18.0975 9.68342 18.0975 9.29289 17.707L4.29289 12.707C3.90237 12.3165 3.90237 11.6835 4.29289 11.293C4.68342 10.9024 5.31643 10.9024 5.70696 11.293L9.99992 15.5859L18.2929 7.29295Z" fill="#0E8C0E" />
      </svg>
      <div className="main_text-3 flex flex-col items-start gap-1">
        <div className="flex items-start gap-2.5 self-stretch title-7 text-[#0e8c0e] font-['Inter'] font-bold leading-[150%]">
          Title
        </div>
        <div className="flex items-start gap-2.5 self-stretch text-7 text-[#0e8c0e] font-['Inter'] text-[.8125rem] leading-[150%]">
          text
        </div>
      </div>
      <div className="flex items-center">
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.2929 4.29295C18.6834 3.90269 19.3165 3.90252 19.707 4.29295C20.0974 4.68339 20.0972 5.31647 19.707 5.70701L13.414 12L19.707 18.293C20.0973 18.6835 20.0974 19.3165 19.707 19.707C19.3165 20.0973 18.6834 20.0973 18.2929 19.707L11.9999 13.414L5.70695 19.707C5.31642 20.0974 4.68337 20.0975 4.29289 19.707C3.90256 19.3165 3.90255 18.6834 4.29289 18.293L10.5859 12L4.29289 5.70701C3.90237 5.31649 3.90237 4.68348 4.29289 4.29295C4.68341 3.90243 5.31643 3.90243 5.70695 4.29295L11.9999 10.5859L18.2929 4.29295Z" fill="#919599" />
        </svg>
      </div>
    </div>
    <div className="flex items-start gap-2">
      <div className="flex justify-center items-center gap-2 pt-[0.9375rem] pb-[0.9375rem] px-4 rounded-xl border-2 border-[#dadfe5] button-6 text-neutral-800 font-['Inter'] text-sm font-semibold leading-[130%]">
        Button
      </div>
      <div className="flex justify-center items-center gap-2 pt-[0.9375rem] pb-[0.9375rem] px-4 rounded-xl border-2 border-[#919599]/0 button-7 text-neutral-800 font-['Inter'] text-sm font-semibold leading-[130%]">
        Button
      </div>
    </div>
  </div>
</div>
);

export default FeedbackNotice;
