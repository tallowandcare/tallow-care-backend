import nodemailer from "nodemailer";

export const sendContactMail = async (req, res) => {

  try {

    const {

      firstName,
      lastName,
      email,
      phone,
      pet,
      message,
      newsletter,

    } = req.body;

    // REQUIRED FIELD VALIDATION
    
    if (
      !firstName ||
      !email ||
      !message
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Required fields missing ❌",

      });

    }



    // =========================
    // EMAIL FORMAT VALIDATION
    // =========================

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailRegex.test(email)
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid email format ❌",

      });

    }



    // =========================
    // PHONE FORMAT VALIDATION
    // =========================

    const phoneRegex =
      /^[6-9]\d{9}$/;

    if (
      phone &&
      !phoneRegex.test(phone)
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid mobile number ❌",

      });

    }



    // =========================
    // NODEMAILER TRANSPORTER
    // =========================

    const transporter =
      nodemailer.createTransport({

        service: "gmail",

        auth: {

          user:
            process.env.MY_EMAIL,

          pass:
            process.env.MY_APP_PASSWORD,

        },

      });



    // =========================
    // SEND MAIL
    // =========================

    await transporter.sendMail({

      from:
        process.env.MY_EMAIL,

      to:
        process.env.MY_EMAIL,

      subject:
        `New Query from ${firstName}`,

      html: `

        <h2>🐾 New Contact Query</h2>

        <p>
          <b>First Name:</b>
          ${firstName}
        </p>

        <p>
          <b>Last Name:</b>
          ${lastName || "N/A"}
        </p>

        <p>
          <b>Email:</b>
          ${email}
        </p>

        <p>
          <b>Phone:</b>
          ${phone}
        </p>

        <p>
          <b>Pet:</b>
          ${pet}
        </p>

        <p>
          <b>Newsletter:</b>
          ${
            newsletter
              ? "Yes"
              : "No"
          }
        </p>

        <p>
          <b>Message:</b>
        </p>

        <p>
          ${message}
        </p>

      `,

    });



    // =========================
    // SUCCESS RESPONSE
    // =========================

    return res.status(200).json({

      success: true,

      message:
        "Message sent successfully ✅",

    });

  }

  catch (err) {

    console.log(
      "MAIL ERROR:",
      err
    );

    return res.status(500).json({

      success: false,

      message:
        "Mail failed ❌",

    });

  }

};