declare namespace JobRequest {
  export interface CreateJob {
    title: string;
    categoryName?: string;
    categoryId: string;
    serviceName?: string;
    serviceId?: string;
    personalName: string;
    location: {
      coordinates: number[];
      address: string;
    };
    companyLocation?: {
      coordinates: number[];
      address: string;
    };
    email?: string;
    fullMobileNo?: string;
    aboutCompany?: string;
    priority: string;
    procedure?: string;
    jobIdString?: string;
    doorTag?: string;
  }

  export interface JobExists {
    title?: string;
    location?: {
      coordinates?: number[];
      address?: string;
    };
  }

  export interface GetJob {
    jobId: string;
  }

  export interface UpdateJob {
    jobId: string;
    title?: string;
    categoryName?: string;
    categoryId?: string;
    serviceName?: string;
    serviceId?: string;
    personalName?: string;
    location?: {
      coordinates?: number[];
      address?: string;
    };
    companyLocation?: {
      coordinates?: number[];
      address?: string;
    };
    email?: string;
    fullMobileNo?: string;
    aboutCompany?: string;
    priority?: string;
    procedure?: string;
    status?: string;
    completedAt?: number;
    schedule?: number;
  }


  export interface JobList extends ListingRequest {
    coordinatesLatitude?: number;
    coordinatesLongitude?: number;
    serviceCategory?: string[];
    priority?: string[];
  }

  export interface scheduleJob {
    jobId: string;
    schedule: number;
  }

  export interface ServiceIdList {
    serviceType: string;
    categoryName?: string;
    issueTypeName?: string;
    searchKey?: string;
  }

  export interface importJobs {
    jobs: any[];
  }

  export interface jobListByCategory {
    categoryId: string;
  }
}
