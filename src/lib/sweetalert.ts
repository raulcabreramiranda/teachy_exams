"use client";

import Swal, { type SweetAlertIcon, type SweetAlertOptions } from "sweetalert2";

type BaseAlertOptions = {
  title: string;
  text?: string;
  confirmButtonText?: string;
  timer?: number;
  showConfirmButton?: boolean;
};

function createOptions(
  icon: SweetAlertIcon,
  options: BaseAlertOptions,
): SweetAlertOptions {
  return {
    icon,
    title: options.title,
    text: options.text,
    confirmButtonText: options.confirmButtonText ?? "OK",
    confirmButtonColor: "#0f172a",
    cancelButtonColor: "#cbd5e1",
    reverseButtons: true,
    heightAuto: false,
    buttonsStyling: true,
    timer: options.timer,
    timerProgressBar: Boolean(options.timer),
    showConfirmButton: options.showConfirmButton,
    customClass: {
      popup: "teachy-swal-popup",
      title: "teachy-swal-title",
      confirmButton: "teachy-swal-confirm",
      cancelButton: "teachy-swal-cancel",
    },
  };
}

export async function showSuccessAlert(options: BaseAlertOptions) {
  return Swal.fire(
    createOptions("success", {
      showConfirmButton: options.showConfirmButton ?? !options.timer,
      ...options,
    }),
  );
}

export async function showErrorAlert(options: BaseAlertOptions) {
  return Swal.fire(
    createOptions("error", {
      confirmButtonText: "Close",
      ...options,
    }),
  );
}

type ConfirmAlertOptions = {
  title: string;
  text?: string;
  icon?: SweetAlertIcon;
  confirmButtonText?: string;
  cancelButtonText?: string;
};

export async function showConfirmAlert(options: ConfirmAlertOptions) {
  const result = await Swal.fire({
    ...createOptions(options.icon ?? "warning", {
      title: options.title,
      text: options.text,
      confirmButtonText: options.confirmButtonText ?? "Confirm",
    }),
    showCancelButton: true,
    cancelButtonText: options.cancelButtonText ?? "Cancel",
    focusCancel: true,
  });

  return result.isConfirmed;
}
